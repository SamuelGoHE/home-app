const Sentry = require('@sentry/node');

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (err.name === 'SequelizeValidationError')
    return res.status(400).json({ success: false, message: 'Error de validación', errors: err.errors.map(e => ({ field: e.path, message: e.message })) });
  if (err.name === 'SequelizeUniqueConstraintError')
    return res.status(409).json({ success: false, message: 'Ya existe un registro con esos datos' });
  const status = err.statusCode || 500;
  // Solo los 5xx son fallos reales del servidor dignos de alerta; los 4xx son
  // errores esperables del cliente (validación, permisos, no encontrado).
  if (status >= 500) Sentry.captureException(err);
  res.status(status).json({ success: false, message: err.message || 'Error interno del servidor' });
};

const notFound = (req, res) =>
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.path}` });

module.exports = { errorHandler, notFound };
