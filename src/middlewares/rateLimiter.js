'use strict';

const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

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

module.exports = { loginLimiter, forgotPasswordLimiter };
