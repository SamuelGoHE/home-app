'use strict';

const { createClient } = require('redis');
require('dotenv').config();

const MAX_RETRY_DELAY_MS = 30_000;
const MAX_RETRIES = 10;

let redisAvailable = false;

const redisClient = createClient({
  // Sin esto, los comandos se encolan mientras Redis está caído y las requests
  // (login, auth middleware) se cuelgan minutos esperando la reconexión.
  // Con esto fallan al instante y activan los try/catch de degradación graceful.
  disableOfflineQueue: true,
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    connectTimeout: 3_000,
    reconnectStrategy: (retries) => {
      if (retries >= MAX_RETRIES) {
        return new Error('Redis no disponible — operando sin caché de sesiones');
      }
      const base   = Math.min(500 * 2 ** retries, MAX_RETRY_DELAY_MS);
      const jitter = Math.floor(Math.random() * 500);
      return base + jitter;
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => {
  if (redisAvailable || err.code !== 'ECONNREFUSED') {
    console.error('❌ Redis error:', err?.message || err);
  }
});
redisClient.on('connect',      () => { redisAvailable = true;  console.log('✅ Redis conectado'); });
redisClient.on('reconnecting', () => { /* silencioso */ });
redisClient.on('ready',        () => console.log('✅ Redis listo'));
redisClient.on('end',          () => { redisAvailable = false; console.warn('⚠️  Redis desconectado'); });

/**
 * Inicia la conexión sin bloquear el arranque del servidor.
 * Espera máximo 2 segundos: si Redis no responde, avisa y sigue.
 * El cliente sigue reintentando en segundo plano.
 */
const connectRedis = async () => {
  // Disparamos la conexión sin await para no bloquear el proceso.
  redisClient.connect().catch(() => {
    // Los errores se manejan en los event listeners de arriba.
  });

  // Esperamos hasta 2s. Si Redis conecta → genial. Si no → avisamos y seguimos.
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (!redisAvailable) {
        console.warn('⚠️  Redis no disponible — las sesiones no podrán revocarse hasta que conecte');
      }
      resolve();
    }, 2_000);

    redisClient.once('ready', () => {
      clearTimeout(timer);
      resolve();
    });
  });
};

module.exports = { redisClient, connectRedis };
