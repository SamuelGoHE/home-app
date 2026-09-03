jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn() },
  WorkerProfile: { findOne: jest.fn(), create: jest.fn() },
  WorkerServiceRate: { bulkCreate: jest.fn(), destroy: jest.fn() },
  Rating: { findAll: jest.fn(), findOne: jest.fn() },
  Project: { count: jest.fn() },
}));

jest.mock('../src/config/database', () => ({
  sequelize: { escape: (v) => `'${v}'` },
}));

jest.mock('sequelize', () => ({
  Op: { or: Symbol('or'), in: Symbol('in'), contains: Symbol('contains') },
  fn: (name, c) => `${name}(${c})`,
  col: (c) => c,
  literal: (s) => ({ literal: s }),
}));

jest.mock('../src/utils/jwt', () => ({
  revokeAllRefreshTokens: jest.fn(),
  blacklistAccessToken: jest.fn(),
}));

jest.mock('../src/utils/storage', () => ({
  uploadAvatar: jest.fn(),
}));

jest.mock('../src/services/workerPortfolioService', () => ({
  listPhotos: jest.fn().mockResolvedValue([]),
}));

const userService = require('../src/services/userService');
const { User, WorkerProfile, WorkerServiceRate } = require('../src/models');
const { revokeAllRefreshTokens } = require('../src/utils/jwt');

describe('userService.getUserByEmail', () => {
  beforeEach(() => jest.clearAllMocks());

  test('exige el email (400)', async () => {
    await expect(userService.getUserByEmail()).rejects.toMatchObject({ statusCode: 400 });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('404 si no existe', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(userService.getUserByEmail('x@y.com')).rejects.toMatchObject({ statusCode: 404 });
  });

  test('devuelve solo id/name/email', async () => {
    User.findOne.mockResolvedValue({ id: 'u1', name: 'Ana', email: 'a@y.com', password: 'secreto' });
    await expect(userService.getUserByEmail('a@y.com')).resolves.toEqual({ id: 'u1', name: 'Ana', email: 'a@y.com' });
  });
});

describe('userService.updateProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  test('404 si el usuario no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(userService.updateProfile('u1', { name: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('400 si el nuevo email ya está en uso', async () => {
    User.findByPk.mockResolvedValue({ id: 'u1', email: 'viejo@y.com', update: jest.fn() });
    User.findOne.mockResolvedValue({ id: 'otro' });
    await expect(userService.updateProfile('u1', { email: 'ocupado@y.com' }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('solo actualiza los campos presentes y devuelve el usuario saneado', async () => {
    const update = jest.fn();
    const toSafeJSON = jest.fn().mockReturnValue({ id: 'u1', name: 'Nuevo' });
    User.findByPk.mockResolvedValue({ id: 'u1', email: 'a@y.com', update, toSafeJSON });

    const res = await userService.updateProfile('u1', { name: 'Nuevo', phone: '300' });

    expect(update).toHaveBeenCalledWith({ name: 'Nuevo', phone: '300' });
    expect(res).toEqual({ id: 'u1', name: 'Nuevo' });
  });
});

describe('userService.updateWorkerProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  const worker = { id: 'w1', role: 'trabajador', city: 'Medellín' };

  test('403 si no es trabajador', async () => {
    await expect(userService.updateWorkerProfile({ id: 'c1', role: 'cliente' }, {}))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('400 si service_rates no es una lista', async () => {
    await expect(userService.updateWorkerProfile(worker, { service_rates: 'no-lista' }))
      .rejects.toMatchObject({ statusCode: 400, message: 'Las tarifas deben enviarse como una lista' });
  });

  test('400 si publica una tarifa para una especialidad que no tiene', async () => {
    await expect(userService.updateWorkerProfile(worker, {
      specialties: ['plomería'],
      service_rates: [{ specialty: 'electricidad', price_unit: 'por_dia', amount: 100 }],
    })).rejects.toMatchObject({ statusCode: 400, message: 'Solo puedes publicar precios para tus especialidades' });
  });

  test('400 si repite la especialidad', async () => {
    await expect(userService.updateWorkerProfile(worker, {
      specialties: ['plomería'],
      service_rates: [
        { specialty: 'plomería', price_unit: 'por_dia', amount: 100 },
        { specialty: 'plomería', price_unit: 'por_dia', amount: 120 },
      ],
    })).rejects.toMatchObject({ statusCode: 400, message: 'No puedes repetir la tarifa de una especialidad' });
  });

  test('400 si la unidad de cobro es inválida', async () => {
    await expect(userService.updateWorkerProfile(worker, {
      specialties: ['plomería'],
      service_rates: [{ specialty: 'plomería', price_unit: 'por_semana', amount: 100 }],
    })).rejects.toMatchObject({ statusCode: 400, message: 'Unidad de cobro inválida' });
  });

  test('400 si una tarifa fija no tiene precio mayor que cero', async () => {
    await expect(userService.updateWorkerProfile(worker, {
      specialties: ['plomería'],
      service_rates: [{ specialty: 'plomería', price_unit: 'por_dia', amount: 0 }],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('crea el perfil si no existe y persiste las tarifas (created: true)', async () => {
    WorkerProfile.findOne.mockResolvedValue(null);
    WorkerProfile.create.mockResolvedValue({ id: 'p-new' });

    const res = await userService.updateWorkerProfile(worker, {
      specialties: ['plomería'],
      service_rates: [{ specialty: 'plomería', price_unit: 'a_convenir', amount: null }],
    });

    expect(WorkerProfile.create).toHaveBeenCalled();
    expect(WorkerServiceRate.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({ specialty: 'plomería', worker_id: 'w1' }),
    ]);
    expect(res).toEqual({ profile: { id: 'p-new' }, created: true });
  });

  test('actualiza el perfil existente y reemplaza tarifas (created: false)', async () => {
    const update = jest.fn();
    WorkerProfile.findOne.mockResolvedValue({ id: 'p1', update, bio: 'x' });

    const res = await userService.updateWorkerProfile(worker, {
      specialties: ['plomería'],
      service_rates: [{ specialty: 'plomería', price_unit: 'por_dia', amount: 150 }],
    });

    expect(update).toHaveBeenCalled();
    expect(WorkerServiceRate.destroy).toHaveBeenCalledWith({ where: { worker_id: 'w1' } });
    expect(WorkerServiceRate.bulkCreate).toHaveBeenCalled();
    expect(res).toEqual({ profile: { id: 'p1', update, bio: 'x' }, created: false });
  });
});

describe('userService.changePassword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('400 si la nueva contraseña no cumple la política', async () => {
    await expect(userService.changePassword('u1', 'tok', { currentPassword: 'x', newPassword: 'corta' }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  test('401 si la contraseña actual es incorrecta', async () => {
    User.findByPk.mockResolvedValue({ comparePassword: jest.fn().mockResolvedValue(false) });
    await expect(userService.changePassword('u1', 'tok', { currentPassword: 'mala', newPassword: 'Abcdef12' }))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  test('cambia la contraseña y revoca todas las sesiones', async () => {
    const save = jest.fn();
    const user = { comparePassword: jest.fn().mockResolvedValue(true), save };
    User.findByPk.mockResolvedValue(user);

    await userService.changePassword('u1', 'tok', { currentPassword: 'ok', newPassword: 'Abcdef12' });

    expect(user.password).toBe('Abcdef12');
    expect(save).toHaveBeenCalled();
    expect(revokeAllRefreshTokens).toHaveBeenCalledWith('u1');
  });
});

describe('userService.toggleActive', () => {
  beforeEach(() => jest.clearAllMocks());

  test('400 si intenta bloquearse a sí mismo', async () => {
    await expect(userService.toggleActive('u1', { id: 'u1' })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('404 si el usuario objetivo no existe', async () => {
    User.findByPk.mockResolvedValue(null);
    await expect(userService.toggleActive('u2', { id: 'admin' })).rejects.toMatchObject({ statusCode: 404 });
  });

  test('403 si intenta bloquear a otro admin', async () => {
    User.findByPk.mockResolvedValue({ id: 'u2', role: 'admin' });
    await expect(userService.toggleActive('u2', { id: 'admin' })).rejects.toMatchObject({ statusCode: 403 });
  });

  test('alterna is_active y devuelve el nuevo estado', async () => {
    const update = jest.fn().mockImplementation(function (patch) { Object.assign(this, patch); });
    const target = { id: 'u2', role: 'cliente', is_active: true, update };
    User.findByPk.mockResolvedValue(target);

    const res = await userService.toggleActive('u2', { id: 'admin' });

    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(res).toEqual({ id: 'u2', is_active: false });
  });
});
