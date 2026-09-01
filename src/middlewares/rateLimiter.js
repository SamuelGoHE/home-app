'use strict';

const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';
// En dev/test relajamos los topes para no estorbar el desarrollo ni los tests
// que no ejercitan explícitamente el rate limit.
const relaxed = isDev || process.env.NODE_ENV === 'test';

/**
 * 20 intentos de login por IP cada 15 minutos.
 * Generoso para IPs compartidas (NAT corporativo, campus) pero frena escaneos automáticos.
 * La capa por-email en authService es la que realmente protege cada cuenta.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos desde esta red. Intenta en 15 minutos.',
  },
});

/**
 * 5 solicitudes de recuperación de contraseña por IP por hora.
 * Previene que un atacante use este endpoint para hacer spam de correos.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 1_000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación. Intenta en 1 hora.',
  },
});

/**
 * Fábrica de limiters POR USUARIO para creación de recursos. A diferencia de los
 * limiters por IP (que protegen contra escaneo/spam desde una red), estos frenan
 * a un usuario autenticado concreto: la clave es su `id`, no la IP compartida.
 * Se montan siempre después de `authenticate`, así que `req.user` existe; se deja
 * un fallback a la IP por robustez.
 */
const createPerUserLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: { success: false, message },
  });

// En dev/test se relaja el tope real para no estorbar; el comportamiento de
// keying por-usuario y de bloqueo se prueba directamente sobre createPerUserLimiter.
const perHour = (max) => (relaxed ? 10_000 : max);

// Un cliente no debería necesitar enviar más de ~30 solicitudes de servicio por
// hora; por encima de eso es spam a los trabajadores.
const createQuoteLimiter = createPerUserLimiter({
  windowMs: 60 * 60 * 1000,
  max: perHour(30),
  message: 'Has enviado demasiadas solicitudes en poco tiempo. Intenta de nuevo en un rato.',
});

// Creación de proyectos (hoy admin): tope generoso, solo como red de seguridad.
const createProjectLimiter = createPerUserLimiter({
  windowMs: 60 * 60 * 1000,
  max: perHour(30),
  message: 'Demasiados proyectos creados en poco tiempo. Intenta de nuevo en un rato.',
});

// Calificaciones: la lógica de negocio ya limita (solo proyectos completados sin
// calificar), esto frena abuso automatizado.
const createRatingLimiter = createPerUserLimiter({
  windowMs: 60 * 60 * 1000,
  max: perHour(20),
  message: 'Demasiadas calificaciones en poco tiempo. Intenta de nuevo en un rato.',
});

module.exports = {
  loginLimiter,
  forgotPasswordLimiter,
  createPerUserLimiter,
  createQuoteLimiter,
  createProjectLimiter,
  createRatingLimiter,
};
