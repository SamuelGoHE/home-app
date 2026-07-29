const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// El aud del idToken depende de la plataforma: en Android es el cliente Web,
// en iOS es el cliente iOS. Aceptamos ambos.
const googleAudiences = () =>
  [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean);

/**
 * Verifica un Google ID Token y extrae el perfil del usuario.
 * @param {string} idToken - Token recibido del frontend via @react-oauth/google
 * @returns {{ providerId, email, name, avatar }}
 */
const verifyGoogleToken = async (token) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID no configurado en .env');
  }
  if (!token) {
    const e = new Error('Google token no proporcionado'); e.statusCode = 400; throw e;
  }

  // Si se envía un ID Token JWT, lo verificamos directamente.
  if (token.split('.').length === 3) {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: googleAudiences(),
    });
    const payload = ticket.getPayload();
    return {
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
    };
  }

  // Si se envía un Access Token, verificamos que pertenezca a nuestro cliente y obtenemos el perfil.
  const tokenInfoRes = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
    params: { access_token: token },
  });
  const tokenInfo = tokenInfoRes.data;
  const audience = tokenInfo.audience || tokenInfo.aud || tokenInfo.issued_to;
  if (!googleAudiences().includes(audience)) {
    const e = new Error('Token de Google inválido'); e.statusCode = 401; throw e;
  }

  const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = userInfoRes.data;
  return {
    providerId: payload.sub || payload.id,
    email: payload.email,
    name: payload.name,
    avatar: payload.picture,
  };
};

/**
 * Verifica un Facebook Access Token usando la Graph API.
 * @param {string} accessToken - Token recibido del FB SDK del frontend
 * @returns {{ providerId, email, name, avatar }}
 */
const verifyFacebookToken = async (accessToken) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    throw new Error('FACEBOOK_APP_ID / FACEBOOK_APP_SECRET no configurados en .env');
  }

  // 1. Verificar que el token pertenece a nuestra app
  const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
  const debugRes = await axios.get('https://graph.facebook.com/debug_token', {
    params: { input_token: accessToken, access_token: appToken },
  });
  const { is_valid, app_id } = debugRes.data.data;
  if (!is_valid || app_id !== process.env.FACEBOOK_APP_ID) {
    throw new Error('Token de Facebook inválido');
  }

  // 2. Obtener perfil
  const profileRes = await axios.get('https://graph.facebook.com/me', {
    params: { fields: 'id,name,email,picture.type(large)', access_token: accessToken },
  });
  const p = profileRes.data;
  return {
    providerId: p.id,
    email: p.email || null,
    name: p.name,
    avatar: p.picture?.data?.url || null,
  };
};

/**
 * Verifica un Apple identity token (JWT RS256) contra las claves públicas de Apple.
 *
 * Antes se confiaba en el providerId enviado por el cliente sin ninguna
 * verificación, permitiendo forjar identidades. Ahora:
 *   1. Se valida la firma con la clave pública de Apple (por `kid`).
 *   2. Se valida `iss` = https://appleid.apple.com y `aud` = nuestro client id.
 *   3. El providerId (`sub`) y el email se toman del token verificado, no del cliente.
 *
 * @param {string} identityToken - identityToken devuelto por Sign in with Apple.
 * @returns {{ providerId, email, name, avatar }}
 */
const APPLE_ISSUER = 'https://appleid.apple.com';
let appleKeysCache = { keys: null, fetchedAt: 0 };
const APPLE_KEYS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const appleAudiences = () =>
  (process.env.APPLE_CLIENT_ID || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const getApplePublicKey = async (kid) => {
  const fresh = appleKeysCache.keys && Date.now() - appleKeysCache.fetchedAt < APPLE_KEYS_TTL_MS;
  if (!fresh) {
    const { data } = await axios.get(`${APPLE_ISSUER}/auth/keys`);
    appleKeysCache = { keys: data.keys, fetchedAt: Date.now() };
  }
  const jwk = appleKeysCache.keys.find((k) => k.kid === kid);
  if (!jwk) {
    const e = new Error('Clave de Apple no encontrada'); e.statusCode = 401; throw e;
  }
  // JWK → PEM usando el módulo crypto nativo (sin dependencias extra).
  return crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
};

const verifyAppleToken = async (identityToken, fallbackProfile = {}) => {
  if (appleAudiences().length === 0) {
    throw new Error('APPLE_CLIENT_ID no configurado en .env');
  }
  if (!identityToken || identityToken.split('.').length !== 3) {
    const e = new Error('Apple identity token inválido'); e.statusCode = 400; throw e;
  }

  const header = JSON.parse(Buffer.from(identityToken.split('.')[0], 'base64').toString('utf8'));
  const publicKey = await getApplePublicKey(header.kid);

  let payload;
  try {
    payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: APPLE_ISSUER,
      audience: appleAudiences(),
    });
  } catch {
    const e = new Error('Token de Apple inválido'); e.statusCode = 401; throw e;
  }

  return {
    providerId: payload.sub,
    email: payload.email || fallbackProfile.email || null,
    // Apple solo envía el nombre en el PRIMER login, vía el cliente; es solo display.
    name: fallbackProfile.name || 'Usuario Apple',
    avatar: null,
  };
};

module.exports = { verifyGoogleToken, verifyFacebookToken, verifyAppleToken };
