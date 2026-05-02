const crypto = require('crypto');
const { User } = require('../models');
const { generateTokens, saveRefreshToken, getStoredRefreshToken, verifyRefreshToken, revokeRefreshToken, blacklistAccessToken } = require('../utils/jwt');
const { verifyGoogleToken, verifyFacebookToken } = require('../utils/verifyOAuthToken');

const register = async ({ name, email, password, phone, role = 'cliente', city }) => {
  if (await User.findOne({ where: { email } })) {
    const e = new Error('Este correo ya está registrado'); e.statusCode = 409; throw e;
  }
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({ name, email, password, phone, role, city, verification_token: verificationToken });
  
  if (role === 'trabajador') {
    const { WorkerProfile } = require('../models');
    await WorkerProfile.create({
      user_id: user.id,
      cities_covered: city ? [city] : []
    });
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, refreshToken);
  return { user: user.toSafeJSON(), accessToken, refreshToken };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) { const e = new Error('Credenciales incorrectas'); e.statusCode = 401; throw e; }
  if (!user.is_active) { const e = new Error('Cuenta desactivada'); e.statusCode = 403; throw e; }
  if (!await user.comparePassword(password)) { const e = new Error('Credenciales incorrectas'); e.statusCode = 401; throw e; }
  await user.update({ last_login: new Date() });
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, refreshToken);
  return { user: user.toSafeJSON(), accessToken, refreshToken };
};

const refreshTokens = async (refreshToken) => {
  let decoded;
  try { decoded = verifyRefreshToken(refreshToken); }
  catch { const e = new Error('Refresh token inválido'); e.statusCode = 401; throw e; }
  const stored = await getStoredRefreshToken(decoded.userId);
  if (stored && stored !== refreshToken) { const e = new Error('Refresh token no válido'); e.statusCode = 401; throw e; }
  const user = await User.findByPk(decoded.userId);
  if (!user || !user.is_active) { const e = new Error('Usuario no encontrado'); e.statusCode = 401; throw e; }
  const tokens = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, tokens.refreshToken);
  return { user: user.toSafeJSON(), ...tokens };
};

const logout = async (userId, accessToken) => {
  await revokeRefreshToken(userId);
  const decoded = require('jsonwebtoken').decode(accessToken);
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blacklistAccessToken(accessToken, ttl);
  }
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) return { message: 'Si el correo existe, recibirás instrucciones' };
  const resetToken = crypto.randomBytes(32).toString('hex');
  await user.update({ reset_password_token: resetToken, reset_password_expires: new Date(Date.now() + 3600000) });
  if (process.env.NODE_ENV === 'development')
    return { message: 'Si el correo existe, recibirás instrucciones', resetToken };
  return { message: 'Si el correo existe, recibirás instrucciones' };
};

const resetPassword = async (token, newPassword) => {
  const user = await User.findOne({ where: { reset_password_token: token } });
  if (!user || user.reset_password_expires < new Date()) {
    const e = new Error('Token inválido o expirado'); e.statusCode = 400; throw e;
  }
  await user.update({ password: newPassword, reset_password_token: null, reset_password_expires: null });
  await revokeRefreshToken(user.id);
  return { message: 'Contraseña actualizada' };
};

/**
 * Autenticar o registrar usuario via OAuth (Google, Facebook, Apple).
 * @param {'google'|'facebook'|'apple'} provider
 * @param {string} token - ID Token o Access Token del proveedor
 * @param {{ email, name, avatar }} fallbackProfile - Perfil enviado desde el frontend (para Apple que no devuelve email en tokens)
 */
const oauthSignIn = async (provider, token, fallbackProfile = {}) => {
  let profile;

  if (provider === 'google') {
    profile = await verifyGoogleToken(token);
  } else if (provider === 'facebook') {
    profile = await verifyFacebookToken(token);
  } else if (provider === 'apple') {
    // Apple envía el perfil directamente en el primer login; el token se verifica en frontend.
    // Usamos el fallbackProfile enviado desde el cliente (email, name, sub como providerId).
    if (!fallbackProfile.providerId) {
      const e = new Error('Apple: providerId requerido'); e.statusCode = 400; throw e;
    }
    profile = {
      providerId: fallbackProfile.providerId,
      email: fallbackProfile.email || null,
      name: fallbackProfile.name || 'Usuario Apple',
      avatar: null,
    };
  } else {
    const e = new Error('Proveedor OAuth no soportado'); e.statusCode = 400; throw e;
  }

  // 1. Buscar por oauth_id + provider
  let user = await User.findOne({ where: { oauth_provider: provider, oauth_id: profile.providerId } });

  // 2. Si no existe pero hay email, buscar por email (posible cuenta duplicada)
  if (!user && profile.email) {
    user = await User.findOne({ where: { email: profile.email } });
    if (user) {
      // Vincular la cuenta existente al proveedor OAuth
      await user.update({ oauth_provider: provider, oauth_id: profile.providerId, avatar: user.avatar || profile.avatar });
    }
  }

  // 3. Si no existe → crear cuenta nueva
  if (!user) {
    user = await User.create({
      name: profile.name || 'Usuario',
      email: profile.email || `${provider}_${profile.providerId}@oauth.local`,
      password: null, // sin contraseña para cuentas OAuth
      avatar: profile.avatar,
      oauth_provider: provider,
      oauth_id: profile.providerId,
      is_verified: true, // ya verificado por el proveedor
      role: 'cliente',
    });
  }

  if (!user.is_active) {
    const e = new Error('Cuenta desactivada'); e.statusCode = 403; throw e;
  }

  await user.update({ last_login: new Date() });
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, refreshToken);
  return { user: user.toSafeJSON(), accessToken, refreshToken };
};

module.exports = { register, login, refreshTokens, logout, forgotPassword, resetPassword, oauthSignIn };
