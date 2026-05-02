const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifica un Google ID Token y extrae el perfil del usuario.
 * @param {string} idToken - Token recibido del frontend via @react-oauth/google
 * @returns {{ providerId, email, name, avatar }}
 */
const verifyGoogleToken = async (idToken) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID no configurado en .env');
  }
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    providerId: payload.sub,
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

module.exports = { verifyGoogleToken, verifyFacebookToken };
