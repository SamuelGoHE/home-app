'use strict';

const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { User, WorkerProfile, WorkerServiceRate } = require('../models');

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, message: 'Cuenta creada exitosamente', data: result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, message: 'Sesión iniciada', data: result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ success: false, message: 'Refresh token requerido' });
  try {
    const result = await authService.refreshTokens(refreshToken);
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(e.statusCode || 401).json({ success: false, message: e.message });
  }
};

const logout = async (req, res) => {
  try {
    // req.token = access token (extraído por el middleware authenticate)
    // req.body.refreshToken = refresh token de esta sesión (enviado por el cliente)
    await authService.logout(req.token, req.body.refreshToken);
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch {
    res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
  }
};

const getMe = async (req, res) => {
  // Recargamos al usuario incluyendo su perfil profesional (si es trabajador)
  // para que la app pueda mostrar/editar bio, especialidades, etc.
  const user = await User.findByPk(req.user.id, {
    include: [
      { model: WorkerProfile, as: 'workerProfile' },
      { model: WorkerServiceRate, as: 'serviceRates', attributes: ['id', 'specialty', 'price_unit', 'amount', 'includes_materials', 'note'] },
    ],
  });
  res.json({ success: true, data: { user: (user || req.user).toSafeJSON() } });
};

const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });
  try {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(e.statusCode || 400).json({ success: false, message: e.message });
  }
};

// El enlace del correo apunta aquí (GET). Verifica y redirige al frontend
// con un flag, para mostrar un mensaje amable sin necesitar una página propia.
const verifyEmail = async (req, res) => {
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
  try {
    await authService.verifyEmail(req.query.token);
    res.redirect(`${frontend}/login?verified=1`);
  } catch {
    res.redirect(`${frontend}/login?verified=0`);
  }
};

const oauthSignIn = async (req, res) => {
  const { provider, token, profile: fallbackProfile } = req.body;
  if (!provider || !token)
    return res.status(400).json({ success: false, message: 'provider y token son requeridos' });
  try {
    const result = await authService.oauthSignIn(provider, token, fallbackProfile || {});
    res.json({ success: true, message: `Sesión iniciada con ${provider}`, data: result });
  } catch (e) {
    res.status(e.statusCode || 500).json({ success: false, message: e.message || 'Error en autenticación OAuth' });
  }
};

module.exports = { register, login, refreshToken, logout, getMe, forgotPassword, resetPassword, verifyEmail, oauthSignIn };
