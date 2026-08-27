const { randomUUID } = require('crypto');
const { supabase } = require('../config/supabase');

const BUCKET = process.env.SUPABASE_PHOTOS_BUCKET || 'project-photos';

/**
 * Sube un archivo en memoria (buffer de multer) a una carpeta del bucket de
 * Supabase Storage y devuelve la URL pública. El bucket debe existir y estar
 * configurado como público (ver .env.example / instrucciones de setup).
 */
const uploadToBucket = async (file, folder) => {
  if (!supabase) {
    const e = new Error('Storage no configurado (faltan SUPABASE_URL/SUPABASE_KEY)');
    e.statusCode = 500;
    throw e;
  }

  const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    const e = new Error(`No se pudo subir el archivo: ${error.message}`);
    e.statusCode = 502;
    throw e;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
};

const uploadProjectPhoto = (file, projectId) => uploadToBucket(file, projectId);
const uploadAvatar = (file, userId) => uploadToBucket(file, `avatars/${userId}`);
const uploadPortfolioPhoto = (file, workerId) => uploadToBucket(file, `portfolio/${workerId}`);

const deleteStorageFile = async (path) => {
  if (!supabase || !path) return;
  await supabase.storage.from(BUCKET).remove([path]);
};

module.exports = {
  uploadProjectPhoto,
  uploadAvatar,
  uploadPortfolioPhoto,
  deleteProjectPhotoFile: deleteStorageFile,
  deleteStorageFile,
  BUCKET,
};
