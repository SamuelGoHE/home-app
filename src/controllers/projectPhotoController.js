const { validationResult } = require('express-validator');
const svc = require('../services/projectPhotoService');

const addPhoto = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const data = await svc.addPhoto(req.params.id, req.file, req.body.stage, req.body.caption, req.user);
    res.status(201).json({ success: true, message: 'Foto subida', data });
  } catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
};

const listPhotos = async (req, res) => {
  try {
    res.json({ success: true, data: await svc.listPhotos(req.params.id, req.user) });
  } catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
};

const deletePhoto = async (req, res) => {
  try {
    await svc.deletePhoto(req.params.photoId, req.user);
    res.json({ success: true, message: 'Foto eliminada' });
  } catch (e) { res.status(e.statusCode || 500).json({ success: false, message: e.message }); }
};

module.exports = { addPhoto, listPhotos, deletePhoto };
