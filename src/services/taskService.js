const { Task, Project, User } = require('../models');
const { Op } = require('sequelize');

class TaskService {
  async updateTaskStatus(taskId, data, user) {
    const task = await Task.findByPk(taskId, { include: [{ model: Project, as: 'project' }] });
    if (!task) throw new Error('Tarea no encontrada');

    if (user.role === 'trabajador') {
      if (task.assigned_to !== user.id) throw new Error('Sin acceso a esta tarea');
      const allowed = ['status', 'notes', 'actual_hours', 'evidence_urls'];
      Object.keys(data).forEach(k => { if (!allowed.includes(k)) delete data[k]; });
    } else if (user.role !== 'admin') {
      throw new Error('Sin acceso a esta tarea');
    }

    if (data.status === 'completada') data.completed_at = new Date();
    await task.update(data);

    // Auto-completar proyecto si todas las tareas están listas
    const pending = await Task.count({ where: { project_id: task.project_id, status: { [Op.ne]: 'completada' } } });
    if (pending === 0) await task.project.update({ status: 'completado', actual_end_date: new Date() });

    return task.reload({ include: [{ model: User, as: 'assignee', attributes: ['id','name','avatar'] }] });
  }
}

module.exports = new TaskService();
