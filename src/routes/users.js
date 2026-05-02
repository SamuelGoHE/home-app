const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { User, WorkerProfile, Rating, Project } = require('../models');
const { authenticate, authorize } = require('../middlewares/auth');
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
      // Buscar si vive en la ciudad O si la cubre en su perfil
      whereClause[Op.or] = [
        { city: city },
        literal(`EXISTS (SELECT 1 FROM worker_profiles WHERE worker_profiles.user_id = "User"."id" AND '${city}' = ANY(worker_profiles.cities_covered))`)
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

    const workers = await User.findAll({
      where: whereClause,
      include: [includeClause],
      attributes: ['id', 'name', 'email', 'avatar', 'role', 'is_active', 'city']
    });

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

    res.json({ success: true, data: enriched });
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
        '$tasks.assigned_user_id$': id
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

    res.json({ success: true, data: workerData });
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

    const { bio, years_experience, specialties, cities_covered } = req.body;

    const workerProfile = await WorkerProfile.findOne({ where: { user_id: req.user.id } });
    if (!workerProfile) {
      // Si por alguna razón no existe, lo creamos
      const newProfile = await WorkerProfile.create({
        user_id: req.user.id,
        bio: bio || null,
        years_experience: years_experience || 0,
        specialties: specialties || [],
        cities_covered: cities_covered || [req.user.city]
      });
      return res.json({ success: true, data: newProfile, message: 'Perfil creado exitosamente' });
    }

    // Actualizamos
    await workerProfile.update({
      bio: bio !== undefined ? bio : workerProfile.bio,
      years_experience: years_experience !== undefined ? years_experience : workerProfile.years_experience,
      specialties: specialties !== undefined ? specialties : workerProfile.specialties,
      cities_covered: cities_covered !== undefined ? cities_covered : workerProfile.cities_covered
    });

    res.json({ success: true, data: workerProfile, message: 'Perfil actualizado exitosamente' });
  } catch (error) {
    next(error);
  }
});

// ── GET /users — lista todos los usuarios (solo admin) ──
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id','name','email','role','city','is_active','rating_avg','rating_count','createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: users });
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

