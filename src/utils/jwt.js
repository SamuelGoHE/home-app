'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { redisClient } = require('../config/redis');

const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 días

// ── Token generation ────────────────────────────────────────────────

/**
 * Genera un par access + refresh token para una sesión.
 * Cada token lleva su propio JTI único.
 * El access token NO lleva el refreshJti intencionalmente:
 * el backend recibe el refreshToken explícitamente en el logout.
 */
const generateTokens = (userId, role) => {
  const payload = { userId, role };

  const accessToken = jwt.sign(
    { ...payload, jti: uuidv4() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { ...payload, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  return { accessToken, refreshToken };
};

const verifyAccessToken  = (token) => jwt.verify(token, process.env.JWT_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

// ── Refresh token storage (multi-device) ───────────────────────────

/**
 * Persiste el refresh token de una sesión.
 * Clave: refresh_token:{userId}:{jti}  → cada dispositivo tiene su propia entrada.
 */
const saveRefreshToken = async (userId, refreshToken) => {
  try {
    const decoded = jwt.decode(refreshToken);
    if (!decoded?.jti) return;
    await redisClient.setEx(
      `refresh_token:${userId}:${decoded.jti}`,
      REFRESH_TTL_SECONDS,
      '1'
    );
  } catch {}
};

/**
 * Verifica si una sesión (identificada por su refreshJti) sigue siendo válida en Redis.
 * Fail-open solo en error de Redis (no cuando la clave no existe → token revocado).
 */
const isRefreshTokenValid = async (userId, refreshJti) => {
  try {
    return (await redisClient.get(`refresh_token:${userId}:${refreshJti}`)) === '1';
  } catch {
    // Redis no disponible: aceptamos basándonos en la firma del JWT.
    // Preferimos no desloguear a todos los usuarios por un corte de Redis.
    return true;
  }
};

/** Revoca la sesión de un dispositivo específico. */
const revokeRefreshToken = async (userId, refreshJti) => {
  try {
    if (userId && refreshJti) {
      await redisClient.del(`refresh_token:${userId}:${refreshJti}`);
    }
  } catch {}
};

/**
 * Revoca TODAS las sesiones del usuario (logout en todos los dispositivos).
 * Usa SCAN en lugar de KEYS para no bloquear Redis en producción.
 */
const revokeAllRefreshTokens = async (userId) => {
  try {
    let cursor = 0;
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: `refresh_token:${userId}:*`,
        COUNT: 100,
      });
      cursor = reply.cursor;
      if (reply.keys.length > 0) {
        await redisClient.del(reply.keys);
      }
    } while (cursor !== 0);
  } catch {}
};

// ── Access token blacklist ──────────────────────────────────────────

/**
 * Añade el JTI del access token a la blacklist durante el tiempo que le queda de vida.
 * Usar el JTI (36 chars) en vez del token completo (~400 chars) reduce memoria en Redis.
 */
const blacklistAccessToken = async (token, ttl) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.jti || ttl <= 0) return;
    await redisClient.setEx(`blacklist:${decoded.jti}`, Math.ceil(ttl), '1');
  } catch {}
};

/** El middleware pasa el jti ya decodificado; no necesitamos re-decodificar. */
const isTokenBlacklisted = async (jti) => {
  if (!jti) return false;
  try {
    return (await redisClient.get(`blacklist:${jti}`)) !== null;
  } catch {
    return false; // Redis caído → no bloqueamos a todos los usuarios
  }
};

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  saveRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  revokeAllRefreshTokens,
  blacklistAccessToken,
  isTokenBlacklisted,
};
