const { WorkerPortfolioPhoto, WorkerProfile } = require('../models');
const { uploadPortfolioPhoto, deleteStorageFile } = require('../utils/storage');

const SPECIALTIES = ['pintura', 'enchapes', 'electricidad', 'plomeria', 'obra_gris', 'carpinteria', 'impermeabilizacion', 'otro'];
const PORTFOLIO_LIMIT = 20;

// El trabajador sube fotos a su propio portafolio (o un admin en su nombre)
const addPhoto = async (workerId, file, specialty, caption, user) => {
  if (!file) { const e = new Error('Falta la foto'); e.statusCode = 400; throw e; }
  if (!SPECIALTIES.includes(specialty)) { const e = new Error('Especialidad inválida'); e.statusCode = 400; throw e; }
  if (user.id !== workerId && user.role !== 'admin') {
    const e = new Error('Solo puedes administrar tu propio portafolio'); e.statusCode = 403; throw e;
  }

  // La etiqueta debe corresponder a una especialidad que el trabajador ya configuró en su perfil
  // (si aún no configuró ninguna, se permite cualquier especialidad válida como respaldo).
  const profile = await WorkerProfile.findOne({ where: { user_id: workerId } });
  if (profile?.specialties?.length > 0 && !profile.specialties.includes(specialty)) {
    const e = new Error('Esa especialidad no está en tu perfil. Agrégala primero en "Mi perfil profesional".');
    e.statusCode = 400;
    throw e;
  }

  const count = await WorkerPortfolioPhoto.count({ where: { worker_id: workerId } });
  if (count >= PORTFOLIO_LIMIT) {
    const e = new Error(`Alcanzaste el máximo de ${PORTFOLIO_LIMIT} fotos en tu portafolio. Elimina alguna antes de subir otra.`);
    e.statusCode = 400;
    throw e;
  }

  const { url, path } = await uploadPortfolioPhoto(file, workerId);

  return WorkerPortfolioPhoto.create({
    url,
    storage_path: path,
    specialty,
    caption: caption || null,
    worker_id: workerId,
  });
};

const listPhotos = (workerId) =>
  WorkerPortfolioPhoto.findAll({
    where: { worker_id: workerId },
    order: [['created_at', 'DESC']],
  });

const deletePhoto = async (photoId, user) => {
  const photo = await WorkerPortfolioPhoto.findByPk(photoId);
  if (!photo) { const e = new Error('Foto no encontrada'); e.statusCode = 404; throw e; }

  const isOwner = photo.worker_id === user.id;
  if (!isOwner && user.role !== 'admin') {
    const e = new Error('Solo el dueño del portafolio (o un administrador) puede borrarla'); e.statusCode = 403; throw e;
  }

  await deleteStorageFile(photo.storage_path);
  await photo.destroy();
};

module.exports = { addPhoto, listPhotos, deletePhoto, SPECIALTIES, PORTFOLIO_LIMIT };
