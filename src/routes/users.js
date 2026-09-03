const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const { singlePhoto } = require('../middlewares/upload');
const portfolioService = require('../services/workerPortfolioService');
const payoutAccountService = require('../services/payoutAccountService');
const userService = require('../services/userService');
const { parsePagination, buildMeta } = require('../utils/pagination');
const router = express.Router();

// Obtener un usuario por email (solo admin)
router.get('/by-email', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const data = await userService.getUserByEmail(req.query.email);
    res.json({ success: true, data });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// Obtener la lista de trabajadores (opcionalmente filtrada por ciudad/especialidad)
router.get('/workers', authenticate, async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { city, specialty } = req.query;
    const { rows, count } = await userService.searchWorkers({ city, specialty, limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// Obtener el detalle de un trabajador
router.get('/workers/:id', authenticate, async (req, res, next) => {
  try {
    const data = await userService.getWorkerDetail(req.params.id);
    res.json({ success: true, data });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// Actualizar datos personales del usuario autenticado
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const data = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, data, message: 'Perfil actualizado correctamente' });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// Subir/reemplazar la foto de perfil del usuario autenticado
router.post('/me/avatar', authenticate, singlePhoto('avatar'), async (req, res, next) => {
  try {
    const data = await userService.updateAvatar(req.user.id, req.file);
    res.json({ success: true, data, message: 'Foto de perfil actualizada' });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// Actualizar el perfil del trabajador autenticado
router.put('/worker-profile', authenticate, async (req, res, next) => {
  try {
    const { profile, created } = await userService.updateWorkerProfile(req.user, req.body);
    res.json({
      success: true,
      data: profile,
      message: created ? 'Perfil creado exitosamente' : 'Perfil actualizado exitosamente',
    });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// ── GET /users/me/portfolio — ver el portafolio propio (para administrarlo) ──
router.get('/me/portfolio', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'trabajador') {
      return res.status(403).json({ success: false, message: 'Solo los trabajadores tienen portafolio' });
    }
    res.json({ success: true, data: await portfolioService.listPhotos(req.user.id) });
  } catch (error) {
    next(error);
  }
});

// ── POST /users/me/portfolio — subir una foto al portafolio del trabajador autenticado ──
router.post('/me/portfolio', authenticate, singlePhoto('photo'), async (req, res, next) => {
  try {
    if (req.user.role !== 'trabajador') {
      return res.status(403).json({ success: false, message: 'Solo los trabajadores tienen portafolio' });
    }
    const photo = await portfolioService.addPhoto(req.user.id, req.file, req.body.specialty, req.body.caption, req.user);
    res.status(201).json({ success: true, message: 'Foto agregada a tu portafolio', data: photo });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
});

// ── DELETE /users/me/portfolio/:photoId — borrar una foto del portafolio propio ──
router.delete('/me/portfolio/:photoId', authenticate, async (req, res, next) => {
  try {
    await portfolioService.deletePhoto(req.params.photoId, req.user);
    res.json({ success: true, message: 'Foto eliminada de tu portafolio' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
});

// ── GET /users/me/payout-account — ver el estado de la cuenta de cobro propia ──
router.get('/me/payout-account', authenticate, authorize('trabajador'), async (req, res, next) => {
  try {
    res.json({ success: true, data: await payoutAccountService.getAccount(req.user.id) });
  } catch (error) {
    next(error);
  }
});

// ── POST /users/me/payout-account — registrar o corregir la cuenta de cobro ──
router.post('/me/payout-account', authenticate, authorize('trabajador'), async (req, res, next) => {
  try {
    const account = await payoutAccountService.registerAccount(req.user.id, req.body);
    res.status(201).json({ success: true, message: 'Cuenta bancaria registrada, queda pendiente de verificación', data: account });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
    next(error);
  }
});

// ── PATCH /users/me/password — cambiar contraseña del usuario autenticado ──
router.patch('/me/password', authenticate, async (req, res, next) => {
  try {
    await userService.changePassword(req.user.id, req.token, req.body);
    res.json({ success: true, message: 'Contraseña actualizada. Inicia sesión nuevamente.' });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// ── GET /users — lista todos los usuarios (solo admin) ──
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await userService.listUsers({ limit, offset });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

// ── PATCH /users/:id/toggle-active — bloquear / reactivar usuario (solo admin) ──
router.patch('/:id/toggle-active', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { id, is_active } = await userService.toggleActive(req.params.id, req.user);
    res.json({
      success: true,
      message: is_active ? 'Usuario reactivado' : 'Usuario bloqueado',
      data: { id, is_active },
    });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
});

module.exports = router;
