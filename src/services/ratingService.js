const { Rating, User, Project, Service } = require('../models');
const { Op } = require('sequelize');

// Crear calificación
const createRating = async ({ score, comment, worker_id, project_id }, reviewerId) => {
    // Verificar que el proyecto existe y está completado
    const project = await Project.findByPk(project_id);
    if (!project) {
        const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e;
    }
    if (project.client_id !== reviewerId) {
        const e = new Error('Solo el cliente del proyecto puede calificar'); e.statusCode = 403; throw e;
    }
    if (project.status !== 'completado') {
        const e = new Error('Solo puedes calificar proyectos completados'); e.statusCode = 400; throw e;
    }

    // Verificar que no haya calificado antes
    const existing = await Rating.findOne({ where: { reviewer_id: reviewerId, project_id } });
    if (existing) {
        const e = new Error('Ya calificaste este proyecto'); e.statusCode = 409; throw e;
    }

    // Verificar que el trabajador existe
    const worker = await User.findOne({ where: { id: worker_id, role: 'trabajador' } });
    if (!worker) {
        const e = new Error('Trabajador no encontrado'); e.statusCode = 404; throw e;
    }

    // Crear la calificación
    const rating = await Rating.create({ score, comment, reviewer_id: reviewerId, worker_id, project_id });

    // Actualizar promedio del trabajador
    const allRatings = await Rating.findAll({ where: { worker_id } });
    const avg = allRatings.reduce((sum, r) => sum + r.score, 0) / allRatings.length;
    await worker.update({
        rating_avg: Math.round(avg * 10) / 10,
        rating_count: allRatings.length,
    });

    return rating;
};

// Obtener calificaciones de un trabajador
const getWorkerRatings = async (workerId) => {
    const ratings = await Rating.findAll({
        where: { worker_id: workerId },
        include: [
            { model: User, as: 'reviewer', attributes: ['id', 'name', 'avatar'] },
            { model: Project, as: 'project', attributes: ['id', 'title', 'city'] },
        ],
        order: [['createdAt', 'DESC']],
    });

    const worker = await User.findByPk(workerId, {
        attributes: ['id', 'name', 'avatar', 'rating_avg', 'rating_count'],
    });

    // Distribución de estrellas
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach(r => { distribution[r.score] = (distribution[r.score] || 0) + 1; });

    return { worker, ratings, distribution };
};

// Verificar si un cliente ya calificó un proyecto
const canRate = async (reviewerId, projectId) => {
    const project = await Project.findByPk(projectId);
    if (!project || project.client_id !== reviewerId) return { canRate: false, reason: 'No eres el cliente de este proyecto' };
    if (project.status !== 'completado') return { canRate: false, reason: 'El proyecto no está completado' };
    const existing = await Rating.findOne({ where: { reviewer_id: reviewerId, project_id: projectId } });
    if (existing) return { canRate: false, reason: 'Ya calificaste este proyecto', existing };
    return { canRate: true };
};

// Calificaciones recientes del propio cliente (sus proyectos ya calificados),
// para la sección "Proyectos recién completados" en su home — no de otros clientes.
const getRecentRatings = async (reviewerId, limit = 6) => {
    return Rating.findAll({
        where: { reviewer_id: reviewerId, score: { [Op.gte]: 4 } },
        include: [
            { model: User, as: 'worker', attributes: ['id', 'name', 'avatar', 'rating_avg'] },
            {
                model: Project, as: 'project', attributes: ['id', 'title', 'city'],
                include: [{ model: Service, as: 'service', attributes: ['id', 'name', 'category', 'image_url'] }],
            },
        ],
        order: [['createdAt', 'DESC']],
        limit,
    });
};

// Obtener todas las calificaciones (admin)
const getAllRatings = async () => {
    return Rating.findAll({
        include: [
            { model: User, as: 'reviewer', attributes: ['id', 'name'] },
            { model: User, as: 'worker', attributes: ['id', 'name'] },
            { model: Project, as: 'project', attributes: ['id', 'title'] },
        ],
        order: [['createdAt', 'DESC']],
    });
};

module.exports = { createRating, getWorkerRatings, canRate, getAllRatings, getRecentRatings };