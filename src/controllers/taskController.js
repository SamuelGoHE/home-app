const taskService = require('../services/taskService');

const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTaskStatus(req.params.id, req.body, req.user);
    res.json({ success: true, data: task });
  } catch (error) {
    if (error.message === 'Tarea no encontrada') return res.status(404).json({ success: false, message: error.message });
    if (error.message === 'Sin acceso a esta tarea') return res.status(403).json({ success: false, message: error.message });
    next(error);
  }
};

module.exports = {
  updateTask
};
