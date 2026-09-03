const { Op, fn, col, literal } = require('sequelize');
const { sequelize } = require('../config/database');
const { User, WorkerProfile, WorkerServiceRate, Rating, Project } = require('../models');
const { revokeAllRefreshTokens, blacklistAccessToken } = require('../utils/jwt');
const { uploadAvatar } = require('../utils/storage');
const jwt = require('jsonwebtoken');
const portfolioService = require('./workerPortfolioService');

// Helper para lanzar errores con statusCode, que el router traduce a la respuesta HTTP.
const httpError = (message, statusCode) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

// Buscar un usuario por email (uso admin)
const getUserByEmail = async (email) => {
  if (!email) throw httpError('Email requerido', 400);
  const user = await User.findOne({ where: { email } });
  if (!user) throw httpError('Usuario no encontrado', 404);
  return { id: user.id, name: user.name, email: user.email };
};

// Listar trabajadores (opcionalmente filtrados por ciudad/especialidad), paginado
// y enriquecido con las calificaciones reales de la tabla Ratings.
const searchWorkers = async ({ city, specialty, limit, offset }) => {
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

  const rows = workers.map(w => ({
    ...w.toJSON(),
    rating_avg: ratingMap[w.id]?.rating_avg ?? null,
    rating_count: ratingMap[w.id]?.rating_count ?? 0
  }));

  return { rows, count };
};

// Detalle de un trabajador, con estadísticas reales y su portafolio.
const getWorkerDetail = async (id) => {
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

  if (!worker) throw httpError('Trabajador no encontrado', 404);

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

  return workerData;
};

// Actualizar datos personales del usuario autenticado.
const updateProfile = async (userId, { name, email, phone, city }) => {
  const user = await User.findByPk(userId);
  if (!user) throw httpError('Usuario no encontrado', 404);

  // Si cambia el email, verificar que no esté en uso
  if (email && email !== user.email) {
    const existing = await User.findOne({ where: { email } });
    if (existing) throw httpError('Ese correo ya está registrado', 400);
  }

  await user.update({
    ...(name  !== undefined && { name }),
    ...(email !== undefined && { email }),
    ...(phone !== undefined && { phone }),
    ...(city  !== undefined && { city }),
  });

  // toSafeJSON() elimina password / tokens de verificación y reset del payload.
  return user.toSafeJSON();
};

// Subir/reemplazar la foto de perfil del usuario autenticado.
const updateAvatar = async (userId, file) => {
  if (!file) throw httpError('Falta la foto', 400);

  const user = await User.findByPk(userId);
  if (!user) throw httpError('Usuario no encontrado', 404);

  const { url } = await uploadAvatar(file, userId);
  await user.update({ avatar: url });

  return user.toSafeJSON();
};

// Crear o actualizar el perfil del trabajador autenticado (incluye sus tarifas).
// Devuelve { profile, created } para que el router elija el mensaje adecuado.
const updateWorkerProfile = async (user, body) => {
  if (user.role !== 'trabajador') {
    throw httpError('Solo los trabajadores pueden actualizar este perfil', 403);
  }

  const { bio, years_experience, specialties, cities_covered, pricing_modes, daily_rate, contract_pricing_note, service_rates } = body;

  // pricing_modes solo admite 'por_dia'/'por_contrato'; si viene mal formado, se ignora en vez de fallar.
  const safePricingModes = Array.isArray(pricing_modes)
    ? pricing_modes.filter(m => ['por_dia', 'por_contrato'].includes(m))
    : undefined;

  const allowedUnits = ['por_hora', 'por_dia', 'por_m2', 'por_proyecto', 'a_convenir'];
  let safeServiceRates;
  if (service_rates !== undefined) {
    if (!Array.isArray(service_rates)) {
      throw httpError('Las tarifas deben enviarse como una lista', 400);
    }
    const availableSpecialties = Array.isArray(specialties)
      ? specialties
      : (await WorkerProfile.findOne({ where: { user_id: user.id } }))?.specialties || [];
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
        throw httpError('Solo puedes publicar precios para tus especialidades', 400);
      }
      if (seen.has(rate.specialty)) {
        throw httpError('No puedes repetir la tarifa de una especialidad', 400);
      }
      seen.add(rate.specialty);
      if (!allowedUnits.includes(rate.price_unit)) {
        throw httpError('Unidad de cobro inválida', 400);
      }
      if (rate.price_unit !== 'a_convenir' && (!Number.isFinite(rate.amount) || rate.amount <= 0)) {
        throw httpError('Indica un precio mayor que cero para cada tarifa fija', 400);
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

  const workerProfile = await WorkerProfile.findOne({ where: { user_id: user.id } });
  if (!workerProfile) {
    // Si por alguna razón no existe, lo creamos
    const newProfile = await WorkerProfile.create({
      user_id: user.id,
      bio: bio || null,
      years_experience: years_experience || 0,
      specialties: specialties || [],
      cities_covered: cities_covered || [user.city],
      pricing_modes: safePricingModes || [],
      daily_rate: daily_rate || null,
      contract_pricing_note: contract_pricing_note || null,
    });
    if (ratesToPersist) {
      await WorkerServiceRate.bulkCreate(ratesToPersist.map(rate => ({ ...rate, worker_id: user.id })));
    }
    return { profile: newProfile, created: true };
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
    await WorkerServiceRate.destroy({ where: { worker_id: user.id } });
    if (ratesToPersist.length) {
      await WorkerServiceRate.bulkCreate(ratesToPersist.map(rate => ({ ...rate, worker_id: user.id })));
    }
  }

  return { profile: workerProfile, created: false };
};

// Cambiar la contraseña del usuario autenticado e invalidar todas sus sesiones.
const changePassword = async (userId, accessToken, { currentPassword, newPassword }) => {
  if (
    !newPassword ||
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    throw httpError('La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número', 400);
  }

  const user = await User.findByPk(userId);
  if (!user) throw httpError('Usuario no encontrado', 404);

  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw httpError('La contraseña actual es incorrecta', 401);

  user.password = newPassword;
  await user.save();

  // Invalidar todas las sesiones activas: si el usuario cambia su contraseña,
  // cualquier token robado previo deja de funcionar.
  await revokeAllRefreshTokens(userId);
  const decoded = jwt.decode(accessToken);
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blacklistAccessToken(accessToken, ttl);
  }
};

// Listar todos los usuarios (uso admin), paginado.
const listUsers = async ({ limit, offset }) => {
  return User.findAndCountAll({
    attributes: ['id', 'name', 'email', 'role', 'city', 'is_active', 'rating_avg', 'rating_count', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
};

// Bloquear / reactivar un usuario (uso admin). Devuelve { id, is_active }.
const toggleActive = async (targetId, actingUser) => {
  if (targetId === actingUser.id) {
    throw httpError('No puedes bloquearte a ti mismo', 400);
  }
  const target = await User.findByPk(targetId);
  if (!target) throw httpError('Usuario no encontrado', 404);
  if (target.role === 'admin') throw httpError('No puedes bloquear a otro admin', 403);

  await target.update({ is_active: !target.is_active });
  return { id: target.id, is_active: target.is_active };
};

module.exports = {
  getUserByEmail,
  searchWorkers,
  getWorkerDetail,
  updateProfile,
  updateAvatar,
  updateWorkerProfile,
  changePassword,
  listUsers,
  toggleActive,
};
