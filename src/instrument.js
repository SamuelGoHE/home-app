'use strict';

// Inicialización de Sentry — DEBE cargarse antes que Express y el resto de la
// app (por eso se requiere en la primera línea de index.js). Sin SENTRY_DSN
// queda completamente inerte: no envía nada, no rompe nada. En producción con
// DSN configurado, captura errores no controlados y los reporta con contexto.

require('dotenv').config();
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Muestreo de trazas de performance. 0 = solo errores (default seguro/barato).
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
    // No enviar datos personales identificables por defecto.
    sendDefaultPii: false,
  });
  console.log('✓ Sentry inicializado');
}

module.exports = Sentry;
