const { Router } = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const ratingService = require('../services/ratingService');
const { authenticate, authorize } = require('../middlewares/auth');

const router = Router();
router.use(authenticate);

// GET /api/ratings/my — calificaciones emitidas por el cliente autenticado
router.get('/my', authenticate, async (req, res) => {
    try {
        const { Rating, User, Project } = require('../models');
        const ratings = await Rating.findAll({
            where: { reviewer_id: req.user.id },
            include: [
                { model: User, as: 'worker', attributes: ['id', 'name', 'avatar'] },
                { model: Project, as: 'project', attributes: ['id', 'title', 'city'] },
            ],
            order: [['createdAt', 'DESC']],
        });
        res.json({ success: true, data: ratings });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/ratings — cliente crea calificación
router.post('/', authorize('cliente'), [
    body('score').isInt({ min: 1, max: 5 }).withMessage('Score debe ser entre 1 y 5'),
    body('worker_id').isUUID().withMessage('ID de trabajador inválido'),
    body('project_id').isUUID().withMessage('ID de proyecto inválido'),
    body('comment').optional().isLength({ max: 500 }).withMessage('Comentario máximo 500 caracteres'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
        const rating = await ratingService.createRating(req.body, req.user.id);
        res.status(201).json({ success: true, message: '¡Calificación enviada!', data: rating });
    } catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
});

// GET /api/ratings/recent — proyectos recién completados del propio cliente
router.get('/recent', authorize('cliente'), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);
        const ratings = await ratingService.getRecentRatings(req.user.id, limit);
        res.json({ success: true, data: ratings });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/ratings/worker/:id — calificaciones de un trabajador (todos los roles)
router.get('/worker/:id', async (req, res) => {
    try {
        const data = await ratingService.getWorkerRatings(req.params.id);
        res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/ratings/can-rate/:projectId — puede calificar?
router.get('/can-rate/:projectId', authorize('cliente'), async (req, res) => {
    try {
        const result = await ratingService.canRate(req.user.id, req.params.projectId);
        res.json({ success: true, data: result });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/ratings — todas (admin)
router.get('/', authorize('admin'), async (req, res) => {
    try {
        const ratings = await ratingService.getAllRatings();
        res.json({ success: true, data: ratings });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;