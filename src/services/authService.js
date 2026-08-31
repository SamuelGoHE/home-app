'use strict';

const crypto = require('crypto');
const { User } = require('../models');
const { redisClient } = require('../config/redis');
const {
  generateTokens,
  saveRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  blacklistAccessToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const { verifyGoogleToken, verifyFacebookToken, verifyAppleToken } = require('../utils/verifyOAuthToken');
const emailService = require('./emailService');

// ── Register ────────────────────────────────────────────────────────

const register = async ({ name, email, password, phone, role = 'cliente', city }) => {
  if (await User.findOne({ where: { email } })) {
    const e = new Error('Este correo ya está registrado'); e.statusCode = 409; throw e;
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const user = await User.create({
    name, email, password, phone, role, city,
    verification_token: verificationToken,
  });

  if (role === 'trabajador') {
    const { WorkerProfile } = require('../models');
    await WorkerProfile.create({
      user_id: user.id,
      cities_covered: city ? [city] : [],
    });
  }

  // Correo de verificación (no bloqueante: si falla el envío, el registro
  // sigue siendo válido y el usuario puede pedir reenvío después).
  emailService.sendVerificationEmail(user.email, verificationToken).catch(() => {});

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, refreshToken);
  return { user: user.toSafeJSON(), accessToken, refreshToken };
};

// ── Login ───────────────────────────────────────────────────────────

const MAX_LOGIN_FAILS = 5;
const LOGIN_FAIL_WINDOW = 15 * 60; // segundos

const login = async ({ email, password }) => {
  const failKey = `login_fails:${email.toLowerCase()}`;

  // Capa 2: bloqueo por email (independiente de la IP del atacante)
  try {
    const fails = parseInt(await redisClient.get(failKey) || '0', 10);
    if (fails >= MAX_LOGIN_FAILS) {
      const ttl = await redisClient.ttl(failKey);
      const mins = Math.max(1, Math.ceil(ttl / 60));
      const e = new Error(
        `Cuenta bloqueada por intentos fallidos. Intenta en ${mins} minuto${mins !== 1 ? 's' : ''}.`
      );
      e.statusCode = 429;
      throw e;
    }
  } catch (err) {
    if (err.statusCode === 429) throw err;
    // Redis caído → saltamos el conteo por email; la capa IP sigue activa
  }

  const user = await User.findOne({ where: { email } });
  const validPassword = user && await user.comparePassword(password);

  if (!user || !validPassword) {
    // Incrementar el contador de fallos para este email
    try {
      await redisClient.multi().incr(failKey).expire(failKey, LOGIN_FAIL_WINDOW).exec();
    } catch { /* Redis caído */ }

    const e = new Error('Credenciales incorrectas'); e.statusCode = 401; throw e;
  }

  if (!user.is_active) {
    const e = new Error('Cuenta desactivada'); e.statusCode = 403; throw e;
  }

  // Login exitoso: limpiar el contador
  try { await redisClient.del(failKey); } catch { /* Redis caído */ }

  await user.update({ last_login: new Date() });
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, refreshToken);
  return { user: user.toSafeJSON(), accessToken, refreshToken };
};

// ── Refresh tokens ──────────────────────────────────────────────────

/**
 * Rota el refresh token de una sesión específica.
 * Si el JTI no existe en Redis (token revocado o sesión expirada) → rechaza.
 * Si Redis está caído → acepta basándose en la firma del JWT (graceful degradation).
 */
const refreshTokens = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const e = new Error('Refresh token inválido o expirado'); e.statusCode = 401; throw e;
  }

  // Fail-closed para tokens revocados; fail-open solo si Redis está caído (ver isRefreshTokenValid)
  const valid = await isRefreshTokenValid(decoded.userId, decoded.jti);
  if (!valid) {
    const e = new Error('Sesión expirada, inicia sesión nuevamente'); e.statusCode = 401; throw e;
  }

  const user = await User.findByPk(decoded.userId);
  if (!user || !user.is_active) {
    const e = new Error('Usuario no encontrado'); e.statusCode = 401; throw e;
  }

  // Rotación: eliminar el token viejo, emitir uno nuevo
  await revokeRefreshToken(decoded.userId, decoded.jti);
  const tokens = generateTokens(user.id, user.role);
  await saveRefreshToken(user.id, tokens.refreshToken);
  return { user: user.toSafeJSON(), ...tokens };
};

// ── Logout ──────────────────────────────────────────────────────────

/**
 * Cierra la sesión actual:
 *  - Añade el access token a la blacklist (por su JTI) durante su vida restante.
 *  - Revoca el refresh token de esta sesión específica en Redis.
 *
 * @param {string} accessToken  - Token de acceso actual (del header Authorization)
 * @param {string} [refreshToken] - Refresh token de esta sesión (del body del request)
 */
const logout = async (accessToken, refreshToken) => {
  // Blacklist del access token
  const jwtLib = require('jsonwebtoken');
  const decodedAccess = jwtLib.decode(accessToken);
  if (decodedAccess?.exp) {
    const ttl = decodedAccess.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blacklistAccessToken(accessToken, ttl);
  }

  // Revocar solo la sesión actual (no todas las del usuario)
  if (refreshToken) {
    const decodedRefresh = jwtLib.decode(refreshToken);
    if (decodedRefresh?.userId && decodedRefresh?.jti) {
      await revokeRefreshToken(decodedRefresh.userId, decodedRefresh.jti);
    }
  }
};

/**
 * Cierra todas las sesiones del usuario en todos los dispositivos.
 * Útil después de un cambio de contraseña o detección de cuenta comprometida.
 */
const logoutAllDevices = async (userId, accessToken) => {
  const jwtLib = require('jsonwebtoken');
  const decoded = jwtLib.decode(accessToken);
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blacklistAccessToken(accessToken, ttl);
  }
  await revokeAllRefreshTokens(userId);
};

// ── Forgot / Reset password ─────────────────────────────────────────

const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  // Respuesta idéntica exista o no el email (previene enumeración de usuarios)
  if (!user) return { message: 'Si el correo existe, recibirás instrucciones' };

  const resetToken = crypto.randomBytes(32).toString('hex');
  await user.update({
    reset_password_token: resetToken,
    reset_password_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
  });

  await emailService.sendPasswordResetEmail(user.email, resetToken);

  // En desarrollo devolvemos también el token para poder probar sin SMTP real.
  if (process.env.NODE_ENV === 'development') {
    return { message: 'Si el correo existe, recibirás instrucciones', resetToken };
  }
  return { message: 'Si el correo existe, recibirás instrucciones' };
};

/**
 * Verifica el correo de un usuario a partir del token enviado al registrarse.
 * Idempotente: un token ya consumido simplemente no encuentra usuario.
 */
const verifyEmail = async (token) => {
  if (!token) { const e = new Error('Token requerido'); e.statusCode = 400; throw e; }
  const user = await User.findOne({ where: { verification_token: token } });
  if (!user) { const e = new Error('Token inválido o ya utilizado'); e.statusCode = 400; throw e; }
  await user.update({ is_verified: true, verification_token: null });
  return { message: 'Correo verificado' };
};

const resetPassword = async (token, newPassword) => {
  const user = await User.findOne({ where: { reset_password_token: token } });
  if (!user || user.reset_password_expires < new Date()) {
    const e = new Error('Token inválido o expirado'); e.statusCode = 400; throw e;
  }
  await user.update({
    password: newPassword,
    reset_password_token: null,
    reset_password_expires: null,
  });
  // Invalidar todas las sesiones activas tras cambio de contraseña
  await revokeAllRefreshTokens(user.id);
  return { message: 'Contraseña actualizada' };
};

// ── OAuth ───────────────────────────────────────────────────────────

const oauthSignIn = async (provider, token, fallbackProfile = {}) => {
  let profile;

  if (provider === 'google') {
    profile = await verifyGoogleToken(token);
  } else if (provider === 'facebook') {
    profile = await verifyFacebookToken(token);
  } else if (provider === 'apple') {
    // El identityToken de Apple llega en `token`; el nombre/email de respaldo
    // (solo disponibles en el primer login) llegan en fallbackProfile.
    profile = await verifyAppleToken(token, fallbackProfile);
  } else {
    const e = new Error('Proveedor OAuth no soportado'); e.statusCode = 400; throw e;
  }

  let user = await User.findOne({ where: { oauth_provider: provider, oauth_id: profile.providerId } });

  if (!user && profile.email) {
    user = await User.findOne({ where: { email: profile.email } });
    if (user) {
      await user.update({
        oauth_provider: provider,
        oauth_id: profile.providerId,
        avatar: user.avatar || profile.avatar,
      });
    }
  }

  if (!user) {
    user = await User.create({
      name: profile.name || 'Usuario',
      email: profile.email || `${provider}_${profile.providerId}@oauth.local`,
      password: null,
      avatar: profile.avatar,
      oauth_provider: provider,
      oauth_id: profile.providerId,
      is_verified: true,
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

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
  verifyEmail,
  oauthSignIn,
};
