const { Project, ProjectPhoto, User } = require('../models');
const { uploadProjectPhoto, deleteProjectPhotoFile } = require('../utils/storage');

const STAGES = ['antes', 'durante', 'despues'];

const assertProjectAccess = (project, user) => {
  if (!project) { const e = new Error('Proyecto no encontrado'); e.statusCode = 404; throw e; }
  if (user.role === 'cliente' && project.client_id !== user.id) {
    const e = new Error('Sin acceso a este proyecto'); e.statusCode = 403; throw e;
  }
  if (user.role === 'trabajador' && project.worker_id !== user.id) {
    const e = new Error('Sin acceso a este proyecto'); e.statusCode = 403; throw e;
  }
};

// Solo el trabajador asignado (o admin) puede subir fotos del proyecto
const addPhoto = async (projectId, file, stage, caption, user) => {
  if (!file) { const e = new Error('Falta la foto'); e.statusCode = 400; throw e; }
  if (!STAGES.includes(stage)) { const e = new Error('Etapa inválida'); e.statusCode = 400; throw e; }

  const project = await Project.findByPk(projectId);
  assertProjectAccess(project, user);
  if (user.role === 'trabajador' && project.worker_id !== user.id) {
    const e = new Error('Solo el trabajador asignado puede subir fotos'); e.statusCode = 403; throw e;
  }
  if (!['trabajador', 'admin'].includes(user.role)) {
    const e = new Error('Solo el trabajador o un administrador pueden subir fotos'); e.statusCode = 403; throw e;
  }

  const { url, path } = await uploadProjectPhoto(file, projectId);

  const photo = await ProjectPhoto.create({
    url,
    storage_path: path,
    stage,
    caption: caption || null,
    project_id: projectId,
    uploaded_by: user.id,
  });

  return photo.reload({ include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'avatar'] }] });
};

const listPhotos = async (projectId, user) => {
  const project = await Project.findByPk(projectId);
  assertProjectAccess(project, user);

  return ProjectPhoto.findAll({
    where: { project_id: projectId },
    include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'avatar'] }],
    order: [['created_at', 'ASC']],
  });
};

const deletePhoto = async (photoId, user) => {
  const photo = await ProjectPhoto.findByPk(photoId, { include: [{ model: Project, as: 'project' }] });
  if (!photo) { const e = new Error('Foto no encontrada'); e.statusCode = 404; throw e; }

  const isOwner = photo.uploaded_by === user.id;
  if (!isOwner && user.role !== 'admin') {
    const e = new Error('Solo quien la subió (o un administrador) puede borrarla'); e.statusCode = 403; throw e;
  }

  await deleteProjectPhotoFile(photo.storage_path);
  await photo.destroy();
};

module.exports = { addPhoto, listPhotos, deletePhoto, STAGES };
