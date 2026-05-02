const { Router } = require('express');
const { Message, User } = require('../models');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Obtener el historial de chat de un proyecto
router.get('/:projectId', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { Project } = require('../models');
    
    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });

    // Validar acceso: cliente del proyecto, trabajador del proyecto o administrador
    if (req.user.role !== 'admin' && req.user.id !== project.client_id && req.user.id !== project.worker_id) {
      return res.status(403).json({ success: false, message: 'No tienes acceso a este chat' });
    }
    
    const messages = await Message.findAll({
      where: { project_id: projectId },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
