const express = require('express');
const request = require('supertest');
const { createPerUserLimiter } = require('../src/middlewares/rateLimiter');

// Monta una app mínima: un "authenticate" falso pone req.user.id a partir de un
// header, seguido del limiter por-usuario y un handler que responde 201.
function makeApp(limiter) {
  const app = express();
  app.use((req, _res, next) => { req.user = { id: req.headers['x-user'] }; next(); });
  app.post('/create', limiter, (_req, res) => res.status(201).json({ success: true }));
  return app;
}

describe('createPerUserLimiter — rate limit por usuario', () => {
  test('bloquea al mismo usuario tras superar el máximo (429)', async () => {
    const app = makeApp(createPerUserLimiter({ windowMs: 60_000, max: 2, message: 'stop' }));

    const r1 = await request(app).post('/create').set('x-user', 'user-A');
    const r2 = await request(app).post('/create').set('x-user', 'user-A');
    const r3 = await request(app).post('/create').set('x-user', 'user-A');

    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r3.status).toBe(429);
    expect(r3.body).toEqual({ success: false, message: 'stop' });
  });

  test('los contadores son independientes por usuario', async () => {
    const app = makeApp(createPerUserLimiter({ windowMs: 60_000, max: 1, message: 'stop' }));

    // user-A agota su cupo
    expect((await request(app).post('/create').set('x-user', 'user-A')).status).toBe(201);
    expect((await request(app).post('/create').set('x-user', 'user-A')).status).toBe(429);

    // user-B no se ve afectado por el límite de user-A
    expect((await request(app).post('/create').set('x-user', 'user-B')).status).toBe(201);
  });

  test('expone cabeceras estándar de rate limit', async () => {
    const app = makeApp(createPerUserLimiter({ windowMs: 60_000, max: 5, message: 'stop' }));
    const res = await request(app).post('/create').set('x-user', 'user-C');
    expect(res.headers['ratelimit-limit']).toBe('5');
  });
});
