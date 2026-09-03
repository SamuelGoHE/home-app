jest.mock('../src/models', () => ({
  Rating: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() },
  User: { findOne: jest.fn(), findByPk: jest.fn() },
  Project: { findByPk: jest.fn() },
  Service: {},
}));

jest.mock('sequelize', () => ({
  Op: { gte: Symbol('gte') },
  fn: (name, c) => `${name}(${c})`,
  col: (c) => c,
}));

const ratingService = require('../src/services/ratingService');
const { Rating, User, Project } = require('../src/models');
const { Op } = require('sequelize');

describe('ratingService.getRecentRatings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('only queries the given reviewer\'s own ratings scored 4 or higher', async () => {
    Rating.findAll.mockResolvedValue([]);

    await ratingService.getRecentRatings('client-1');

    expect(Rating.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reviewer_id: 'client-1', score: { [Op.gte]: 4 } },
      })
    );
  });

  test('orders by most recent first and respects the limit', async () => {
    Rating.findAll.mockResolvedValue([]);

    await ratingService.getRecentRatings('client-1', 3);

    expect(Rating.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        order: [['createdAt', 'DESC']],
        limit: 3,
      })
    );
  });

  test('defaults to a limit of 6 when none is given', async () => {
    Rating.findAll.mockResolvedValue([]);

    await ratingService.getRecentRatings('client-1');

    expect(Rating.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 6 }));
  });

  test('returns whatever Rating.findAll resolves', async () => {
    const ratings = [{ id: 'r1', score: 5 }];
    Rating.findAll.mockResolvedValue(ratings);

    const result = await ratingService.getRecentRatings('client-1');

    expect(result).toBe(ratings);
  });
});

describe('ratingService.getAllRatings — paginado', () => {
  beforeEach(() => jest.clearAllMocks());

  test('propaga limit/offset con distinct y devuelve { rows, count }', async () => {
    Rating.findAndCountAll.mockResolvedValue({ rows: [{ id: 'r1' }], count: 7 });

    const result = await ratingService.getAllRatings({ limit: 20, offset: 0 });

    expect(Rating.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0, distinct: true })
    );
    expect(result).toEqual({ rows: [{ id: 'r1' }], count: 7 });
  });
});

describe('ratingService.createRating — permisos y recálculo del promedio', () => {
  beforeEach(() => jest.clearAllMocks());

  const base = { score: 5, comment: 'Excelente', worker_id: 'w-1', project_id: 'p-1' };

  // Deja al proyecto en un estado válido para calificar (cliente correcto, completado).
  const validProject = { id: 'p-1', client_id: 'c-1', status: 'completado' };

  test('rechaza si el proyecto no existe (404)', async () => {
    Project.findByPk.mockResolvedValue(null);
    await expect(ratingService.createRating(base, 'c-1'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Proyecto no encontrado' });
  });

  test('rechaza si quien califica no es el cliente del proyecto (403)', async () => {
    Project.findByPk.mockResolvedValue({ ...validProject, client_id: 'otro' });
    await expect(ratingService.createRating(base, 'c-1'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('rechaza si el proyecto no está completado (400)', async () => {
    Project.findByPk.mockResolvedValue({ ...validProject, status: 'en_progreso' });
    await expect(ratingService.createRating(base, 'c-1'))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('rechaza una segunda calificación del mismo cliente al mismo proyecto (409)', async () => {
    Project.findByPk.mockResolvedValue(validProject);
    Rating.findOne.mockResolvedValue({ id: 'r-existente' });
    await expect(ratingService.createRating(base, 'c-1'))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('rechaza si el trabajador no existe (404)', async () => {
    Project.findByPk.mockResolvedValue(validProject);
    Rating.findOne.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    await expect(ratingService.createRating(base, 'c-1'))
      .rejects.toMatchObject({ statusCode: 404, message: 'Trabajador no encontrado' });
  });

  test('crea la calificación y recalcula el promedio del trabajador (redondeado a 1 decimal)', async () => {
    Project.findByPk.mockResolvedValue(validProject);
    Rating.findOne.mockResolvedValue(null);
    const workerUpdate = jest.fn();
    User.findOne.mockResolvedValue({ id: 'w-1', role: 'trabajador', update: workerUpdate });
    Rating.create.mockResolvedValue({ id: 'r-nueva', score: 5 });
    // La DB agrega: promedio 4.333... (5,4,4) sobre 3 filas → 4.3
    Rating.findAll.mockResolvedValue([{ avg: '4.3333333', count: '3' }]);

    const result = await ratingService.createRating(base, 'c-1');

    expect(Rating.create).toHaveBeenCalledWith(expect.objectContaining({
      score: 5, worker_id: 'w-1', project_id: 'p-1', reviewer_id: 'c-1',
    }));
    // El recálculo usa AVG/COUNT en la query, no trae las filas a memoria.
    expect(Rating.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { worker_id: 'w-1' },
      attributes: [['AVG(score)', 'avg'], ['COUNT(id)', 'count']],
      raw: true,
    }));
    expect(workerUpdate).toHaveBeenCalledWith({ rating_avg: 4.3, rating_count: 3 });
    expect(result).toEqual({ id: 'r-nueva', score: 5 });
  });
});

describe('ratingService.getWorkerRatings — distribución de estrellas', () => {
  beforeEach(() => jest.clearAllMocks());

  test('cuenta cuántas calificaciones hay por cada puntaje', async () => {
    Rating.findAll.mockResolvedValue([{ score: 5 }, { score: 5 }, { score: 3 }, { score: 1 }]);
    User.findByPk.mockResolvedValue({ id: 'w-1', rating_avg: 3.5, rating_count: 4 });

    const { distribution, worker } = await ratingService.getWorkerRatings('w-1');

    expect(distribution).toEqual({ 5: 2, 4: 0, 3: 1, 2: 0, 1: 1 });
    expect(worker).toMatchObject({ id: 'w-1' });
  });
});

describe('ratingService.canRate', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no puede si no es el cliente del proyecto', async () => {
    Project.findByPk.mockResolvedValue({ client_id: 'otro', status: 'completado' });
    const res = await ratingService.canRate('c-1', 'p-1');
    expect(res.canRate).toBe(false);
  });

  test('no puede si el proyecto no está completado', async () => {
    Project.findByPk.mockResolvedValue({ client_id: 'c-1', status: 'en_progreso' });
    const res = await ratingService.canRate('c-1', 'p-1');
    expect(res).toMatchObject({ canRate: false, reason: 'El proyecto no está completado' });
  });

  test('no puede si ya calificó, y devuelve la calificación existente', async () => {
    Project.findByPk.mockResolvedValue({ client_id: 'c-1', status: 'completado' });
    Rating.findOne.mockResolvedValue({ id: 'r-1' });
    const res = await ratingService.canRate('c-1', 'p-1');
    expect(res).toMatchObject({ canRate: false, existing: { id: 'r-1' } });
  });

  test('puede calificar cuando es el cliente, está completado y no ha calificado', async () => {
    Project.findByPk.mockResolvedValue({ client_id: 'c-1', status: 'completado' });
    Rating.findOne.mockResolvedValue(null);
    const res = await ratingService.canRate('c-1', 'p-1');
    expect(res).toEqual({ canRate: true });
  });
});
