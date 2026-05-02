const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis');
require('dotenv').config();

const generateTokens = (userId, role) => {
  const payload = { userId, role };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { accessToken, refreshToken };
};

const verifyAccessToken  = (token) => jwt.verify(token, process.env.JWT_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const saveRefreshToken = async (userId, refreshToken) => {
  try { await redisClient.setEx(`refresh_token:${userId}`, 30*24*60*60, refreshToken); } catch {}
};
const getStoredRefreshToken = async (userId) => {
  try { return await redisClient.get(`refresh_token:${userId}`); } catch { return null; }
};
const revokeRefreshToken = async (userId) => {
  try { await redisClient.del(`refresh_token:${userId}`); } catch {}
};
const blacklistAccessToken = async (token, ttl) => {
  try { await redisClient.setEx(`blacklist:${token}`, ttl, 'revoked'); } catch {}
};
const isTokenBlacklisted = async (token) => {
  try { return (await redisClient.get(`blacklist:${token}`)) !== null; } catch { return false; }
};

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken, saveRefreshToken, getStoredRefreshToken, revokeRefreshToken, blacklistAccessToken, isTokenBlacklisted };
