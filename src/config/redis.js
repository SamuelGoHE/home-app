const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => console.error('❌ Redis error:', err.message));
redisClient.on('connect', () => console.log('✅ Redis conectado'));

const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn('⚠️  Redis no disponible, continuando sin caché...');
  }
};

module.exports = { redisClient, connectRedis };
