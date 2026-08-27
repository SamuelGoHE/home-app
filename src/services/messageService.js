const { Op } = require('sequelize');
const { Project, Message, User, Service } = require('../models');

const assertProjectAccess = (project, user) => {
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }
  if (user.role !== 'admin' && user.id !== project.client_id && user.id !== project.worker_id) {
    const e = new Error('No tienes acceso a este chat'); e.statusCode = 403; throw e;
  }
};

// Lista las conversaciones del usuario: un ítem por proyecto con al menos
// un mensaje, ordenadas por el más reciente primero.
const getConversations = async (user) => {
  const where = {};
  if (user.role === 'cliente') where.client_id = user.id;
  else if (user.role === 'trabajador') where.worker_id = user.id;
  else return []; // admin: sin bandeja personal de chats por ahora

  const projects = await Project.findAll({
    where,
    attributes: ['id', 'title', 'client_id', 'worker_id'],
    include: [
      { model: User, as: 'client', attributes: ['id', 'name', 'avatar'] },
      { model: User, as: 'worker', attributes: ['id', 'name', 'avatar'] },
      { model: Service, as: 'service', attributes: ['id', 'name', 'category', 'image_url'] },
    ],
  });
  if (projects.length === 0) return [];

  const messages = await Message.findAll({
    where: { project_id: { [Op.in]: projects.map(p => p.id) } },
    order: [['createdAt', 'ASC']],
  });

  const byProject = new Map();
  for (const m of messages) {
    const list = byProject.get(m.project_id) || [];
    list.push(m);
    byProject.set(m.project_id, list);
  }

  return projects
    .map(project => {
      const msgs = byProject.get(project.id) || [];
      if (msgs.length === 0) return null; // sin mensajes aún, no es una conversación
      const last = msgs[msgs.length - 1];
      const counterpart = user.role === 'cliente' ? project.worker : project.client;
      return {
        project_id: project.id,
        project_title: project.title,
        service: project.service,
        counterpart,
        last_message: { text: last.text, created_at: last.createdAt, sender_id: last.sender_id },
        unread_count: msgs.filter(m => m.sender_id !== user.id && !m.read).length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.last_message.created_at) - new Date(a.last_message.created_at));
};

// Marca como leídos los mensajes de la contraparte en un proyecto
const markAsRead = async (projectId, user) => {
  const project = await Project.findByPk(projectId);
  assertProjectAccess(project, user);

  await Message.update(
    { read: true },
    { where: { project_id: projectId, sender_id: { [Op.ne]: user.id }, read: false } }
  );
};

module.exports = { getConversations, markAsRead };
