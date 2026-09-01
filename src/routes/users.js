const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, WorkerProfile, WorkerServiceRate, Rating, Project } = require('../models');
const { authenticate, authorize } = require('../middlewares/auth');
const { revokeAllRefreshTokens, blacklistAccessToken } = require('../utils/jwt');
const { singlePhoto } = require('../middlewares/upload');
const { uploadAvatar } = require('../utils/storage');
const portfolioService = require('../services/workerPortfolioService');
const payoutAccountService = require('../services/payoutAccountService');
const { parsePagination, buildMeta } = require('../utils/pagination');
const router = express.Router();

// Obtener un usuario por email (solo admin)
router.get('/by-email', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });
    
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    
    res.json({ success: true, data: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    next(error);
  }
});

// Obtener la lista de trabajadores (opcionalmente filtrada por ciudad/especialidad)
router.get('/workers', authenticate, async (req, res, next) => {
  try {
    const { city, specialty } = req.query;
    
    let whereClause = { role: 'trabajador' };
    let includeWhere = {};

    if (city) {
      // Buscar si vive en la ciudad O si la cubre en su perfil.
      // sequelize.escape() cita y escapa el valor → previene inyección SQL.
      const safeCity = sequelize.escape(city);
      whereClause[Op.or] = [
        { city: city },
        literal(`EXISTS (SELECT 1 FROM worker_profiles WHERE worker_profiles.user_id = "User"."id" AND ${safeCity} = ANY(worker_profiles.cities_covered))`)
      ];
    }
    if (specialty) {
      includeWhere.specialties = { [Op.contains]: [specialty] };
    }

    let includeClause = {
      model: WorkerProfile,
      as: 'workerProfile',
      required: true,
      where: includeWhere
    };

    const workerIncludes = [includeClause];
    // Cuando el cliente busca un oficio, solo se muestran quienes publicaron
    // una tarifa para ese oficio. Así nunca se compara un precio genérico.
    if (specialty) {
      workerIncludes.push({
        model: WorkerServiceRate,
        as: 'serviceRates',
        required: true,
        where: { specialty },
        attributes: ['id', 'specialty', 'price_unit', 'amount', 'includes_materials', 'note'],
      });
    } else {
      workerIncludes.push({
        model: WorkerServiceRate,
        as: 'serviceRates',
        required: false,
        attributes: ['id', 'specialty', 'price_unit', 'amount', 'includes_materials', 'note'],
      });
    }

    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const queryOptions = {
      where: whereClause,
      include: workerIncludes,
      attributes: ['id', 'name', 'email', 'avatar', 'role', 'is_active', 'city'],
      // distinct hace que el COUNT cuente trabajadores únicos y no filas del JOIN.
      distinct: true,
      // Con un oficio seleccionado, comparar por precio primero hace la lista
      // útil desde la primera pantalla. Los valores a convenir (null) quedan al final.
      order: specialty
        ? [[{ model: WorkerServiceRate, as: 'serviceRates' }, 'amount', 'ASC NULLS LAST'], ['name', 'ASC']]
        : [['name', 'ASC']],
      limit,
      offset,
    };
    // Con especialidad el JOIN a serviceRates es `required` (≈1 fila por trabajador),
    // así que un JOIN plano (subQuery:false) permite ordenar por `amount` de forma
    // confiable sin truncar. Sin especialidad se deja el subquery por defecto de
    // Sequelize para que el LIMIT recorte trabajadores enteros y no filas del LEFT JOIN
    // (forzar subQuery aquí rompe: true da error de GROUP BY, false trunca de más).
    if (specialty) queryOptions.subQuery = false;
    const { rows: workers, count } = await User.findAndCountAll(queryOptions);

    // Enriquecer con calificaciones reales
    const workerIds = workers.map(w => w.id);
    const ratingRows = workerIds.length > 0 ? await Rating.findAll({
      where: { worker_id: { [Op.in]: workerIds } },
      attributes: [
        'worker_id',
        [fn('AVG', col('score')), 'avg'],
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['worker_id'],
      raw: true
    }) : [];

    const ratingMap = {};
    ratingRows.forEach(r => {
      ratingMap[r.worker_id] = {
        rating_avg: r.avg ? parseFloat(r.avg).toFixed(1) : null,
        rating_count: parseInt(r.count, 10)
      };
    });

    const enriched = workers.map(w => ({
      ...w.toJSON(),
      rating_avg: ratingMap[w.id]?.rating_avg ?? null,
      rating_count: ratingMap[w.id]?.rating_count ?? 0
    }));

    res.json({ success: true, data: enriched, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (error) {
    next(error);
  }
});

// Obtener el detalle de un trabajador
router.get('/workers/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const worker = await User.findOne({
      where: { id, role: 'trabajador' },
      include: [{
        model: WorkerProfile,
        as: 'workerProfile'
      }, {
        model: WorkerServiceRate,
        as: 'serviceRates',
        attributes: ['id', 'specialty', 'price_unit', 'amount', 'includes_materials', 'note'],
      }],
      attributes: ['id', 'name', 'email', 'avatar', 'city', 'rating_avg', 'rating_count']
    });

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Trabajador no encontrado' });
    }

    // Calcular estadísticas reales
    // 1. Promedio de calificaciones de la tabla Ratings
    const ratingStats = await Rating.findOne({
      where: { worker_id: id },
      attributes: [
        [fn('AVG', col('score')), 'avg'],
        [fn('COUNT', col('id')), 'count']
      ],
      raw: true
    });

    // 2. Proyectos completados donde este trabajador fue asignado
    const completedProjects = await Project.count({
      where: {
        status: 'completado',
        // Buscamos proyectos donde el worker aparezca en alguna tarea
        '$tasks.assigned_to$': id
      },
      include: [{ association: 'tasks', attributes: [] }],
      distinct: true
    }).catch(() => worker.workerProfile?.completed_jobs || 0);

    const avgRating = ratingStats?.avg ? parseFloat(ratingStats.avg).toFixed(1) : null;
    const reviewCount = parseInt(ratingStats?.count || 0, 10);

    const workerData = worker.toJSON();
    workerData.stats = {
      rating_avg: avgRating,
      rating_count: reviewCount,
      completed_projects: completedProjects
    };
    workerData.portfolio = await portfolioService.listPhotos(id);

    res.json({ success: true, data: workerData });
  } catch (error) {
    next(error);
  }
});
// Actualizar datos personales del usuario autenticado
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const { name, email, phone, city } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Si cambia el email, verificar que no esté en uso
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Ese correo ya está registrado' });
      }
    }

    await user.update({
      ...(name  !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(city  !== undefined && { city }),
    });

    // toSafeJSON() elimina password / tokens de verificación y reset del payload.
    res.json({ success: true, data: user.toSafeJSON(), message: 'Perfil actualizado correctamente' });
  } catch (error) {
    next(error);
  }
});

// Subir/reemplazar la foto de perfil del usuario autenticado
router.post('/me/avatar', authenticate, singlePhoto('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Falta la foto' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const { url } = await uploadAvatar(req.file, req.user.id);
    await user.update({ avatar: url });

    res.json({ success: true, data: user.toSafeJSON(), message: 'Foto de perfil actualizada' });
  } catch (error) {
    next(error);
  }
});

// Actualizar el perfil del trabajador autenticado
router.put('/worker-profile', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'trabajador') {
      return res.status(403).json({ success: false, message: 'Solo los trabajadores pueden actualizar este perfil' });
    }

    const { bio, years_experience, specialties, cities_covered, pricing_modes, daily_rate, contract_pricing_note, service_rates } = req.body;

    // pricing_modes solo admite 'por_dia'/'por_contrato'; si viene mal formado, se ignora en vez de fallar.
    const safePricingModes = Array.isArray(pricing_modes)
      ? pricing_modes.filter(m => ['por_dia', 'por_contrato'].includes(m))
      : undefined;

    const allowedUnits = ['por_hora', 'por_dia', 'por_m2', 'por_proyecto', 'a_convenir'];
    let safeServiceRates;
    if (service_rates !== undefined) {
      if (!Array.isArray(service_rates)) {
        return res.status(400).json({ success: false, message: 'Las tarifas deben enviarse como una lista' });
      }
      const availableSpecialties = Array.isArray(specialties)
        ? specialties
        : (await WorkerProfile.findOne({ where: { user_id: req.user.id } }))?.specialties || [];
      const seen = new Set();
      safeServiceRates = service_rates.map(rate => ({
        specialty: String(rate?.specialty || '').trim(),
        price_unit: rate?.price_unit,
        amount: rate?.amount === '' || rate?.amount == null ? null : Number(rate.amount),
        includes_materials: !!rate?.includes_materials,
        note: rate?.note ? String(rate.note).trim().slice(0, 280) : null,
      }));
      for (const rate of safeServiceRates) {
        if (!rate.specialty || !availableSpecialties.includes(rate.specialty)) {
          return res.status(400).json({ success: false, message: 'Solo puedes publicar precios para tus especialidades' });
        }
        if (seen.has(rate.specialty)) {
          return res.status(400).json({ success: false, message: 'No puedes repetir la tarifa de una especialidad' });
        }
        seen.add(rate.specialty);
        if (!allowedUnits.includes(rate.price_unit)) {
          return res.status(400).json({ success: false, message: 'Unidad de cobro inválida' });
        }
        if (rate.price_unit !== 'a_convenir' && (!Number.isFinite(rate.amount) || rate.amount <= 0)) {
          return res.status(400).json({ success: false, message: 'Indica un precio mayor que cero para cada tarifa fija' });
        }
      }
    }

    // Compatibilidad con la app móvil anterior: si aún envía su modalidad
    // global, se publica la misma tarifa en cada especialidad seleccionada.
    // La nueva pantalla puede enviar `service_rates` para valores distintos.
    const legacyRates = safeServiceRates === undefined && Array.isArray(specialties) && safePricingModes !== undefined
      ? specialties.map(specialty => ({
          specialty,
          price_unit: daily_rate ? 'por_dia' : 'a_convenir',
          amount: daily_rate ? Number(daily_rate) : null,
          includes_materials: false,
          note: contract_pricing_note ? String(contract_pricing_note).trim().slice(0, 280) : null,
        }))
      : undefined;
    const ratesToPersist = safeServiceRates ?? legacyRates;

    const workerProfile = await WorkerProfile.findOne({ where: { user_id: req.user.id } });
    if (!workerProfile) {
      // Si por alguna razón no existe, lo creamos
      const newProfile = await WorkerProfile.create({
        user_id: req.user.id,
        bio: bio || null,
        years_experience: years_experience || 0,
        specialties: specialties || [],
        cities_covered: cities_covered || [req.user.city],
        pricing_modes: safePricingModes || [],
        daily_rate: daily_rate || null,
        contract_pricing_note: contract_pricing_note || null,
      });
      if (ratesToPersist) {
        await WorkerServiceRate.bulkCreate(ratesToPersist.map(rate => ({ ...rate, worker_id: req.user.id })));
      }
      return res.json({ success: true, data: newProfile, message: 'Perfil creado exitosamente' });
    }

    // Actualizamos
    await workerProfile.update({
      bio: bio !== undefined ? bio : workerProfile.bio,
      years_experience: years_experience !== undefined ? years_experience : workerProfile.years_experience,
      specialties: specialties !== undefined ? specialties : workerProfile.specialties,
      cities_covered: cities_covered !== undefined ? cities_covered : workerProfile.cities_covered,
      pricing_modes: safePricingModes !== undefined ? safePricingModes : workerProfile.pricing_modes,
      daily_rate: daily_rate !== undefined ? daily_rate : workerProfile.daily_rate,
      contract_pricing_note: contract_pricing_note !== undefined ? contract_pricing_note : workerProfile.contract_pricing_note,
    });

    if (ratesToPersist !== undefined) {
      // Reemplazo atómico a nivel de perfil: las tarifas que el trabajador quitó
      // dejan de estar disponibles en búsquedas nuevas, sin alterar solicitudes ya creadas.
      await WorkerServiceRate.destroy({ where: { worker_id: req.user.id } });
      if (ratesToPersist.length) {
        await WorkerServiceRate.bulkCreate(ratesToPersist.map(rate => ({ ...rate, worker_id: req.user.id })));
      }
    }

    res.json({ success: true, data: workerProfile, message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    next(error);
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
    const { currentPassword, newPassword } = req.body;

    if (
      !newPassword ||
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'La contraseña actual es incorrecta' });
    }

    user.password = newPassword;
    await user.save();

    // Invalidar todas las sesiones activas: si el usuario cambia su contraseña,
    // cualquier token robado previo deja de funcionar.
    await revokeAllRefreshTokens(req.user.id);
    const decoded = require('jsonwebtoken').decode(req.token);
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await blacklistAccessToken(req.token, ttl);
    }

    res.json({ success: true, message: 'Contraseña actualizada. Inicia sesión nuevamente.' });
  } catch (error) {
    next(error);
  }
});

// ── GET /users — lista todos los usuarios (solo admin) ──
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page, pageSize, limit, offset } = parsePagination(req.query);
    const { rows, count } = await User.findAndCountAll({
      attributes: ['id','name','email','role','city','is_active','rating_avg','rating_count','createdAt'],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
    res.json({ success: true, data: rows, pagination: buildMeta({ total: count, page, pageSize }) });
  } catch (error) { next(error); }
});

// ── PATCH /users/:id/toggle-active — bloquear / reactivar usuario (solo admin) ──
router.patch('/:id/toggle-active', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'No puedes bloquearte a ti mismo' });
    }
    const target = await User.findByPk(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    if (target.role === 'admin') return res.status(403).json({ success: false, message: 'No puedes bloquear a otro admin' });

    await target.update({ is_active: !target.is_active });
    res.json({
      success: true,
      message: target.is_active ? 'Usuario reactivado' : 'Usuario bloqueado',
      data: { id: target.id, is_active: target.is_active },
    });
  } catch (error) { next(error); }
});

module.exports = router;
