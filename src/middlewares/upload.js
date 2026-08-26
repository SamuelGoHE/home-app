const multer = require('multer');

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error('Formato de imagen no soportado'));
    }
    cb(null, true);
  },
});

// Envuelve upload.single para que errores de multer (tamaño, tipo) respondan 400
// en vez de caer al 500 genérico del errorHandler.
const singlePhoto = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) { err.statusCode = 400; return next(err); }
    next();
  });
};

module.exports = { upload, singlePhoto };
