jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
  WorkerProfile: { create: jest.fn() },
}));

jest.mock('../src/utils/jwt', () => ({
  generateTokens: jest.fn(() => ({ accessToken: 'access-tok', refreshToken: 'refresh-tok' })),
  saveRefreshToken: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  isRefreshTokenValid: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllRefreshTokens: jest.fn(),
  blacklistAccessToken: jest.fn(),
}));

// Redis mockeado: por defecto "sano". multi() encadena y exec() resuelve.
// (El objeto de multi() se define dentro del factory: jest.mock no permite
// referenciar variables externas.)
jest.mock('../src/config/redis', () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(900),
    multi: jest.fn(() => ({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  },
}));

jest.mock('../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ sent: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

const authService = require('../src/services/authService');
const emailService = require('../src/services/emailService');
const jwt = require('../src/utils/jwt');
const { redisClient } = require('../src/config/redis');
const { User, WorkerProfile } = require('../src/models');

describe('authService forgotPassword', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  test('does not expose reset token outside development', async () => {
    const update = jest.fn();
    User.findOne.mockResolvedValue({ update });
    process.env.NODE_ENV = 'production';

    const result = await authService.forgotPassword('user@mail.com');

    expect(result).toEqual({ message: 'Si el correo existe, recibirás instrucciones' });
  });

  test('exposes reset token in development for local testing', async () => {
    const update = jest.fn();
    User.findOne.mockResolvedValue({ update });
    process.env.NODE_ENV = 'development';

    const result = await authService.forgotPassword('user@mail.com');

    expect(result.message).toBe('Si el correo existe, recibirás instrucciones');
    expect(result.resetToken).toBeTruthy();
  });

  test('sends the reset email when the user exists', async () => {
    User.findOne.mockResolvedValue({ email: 'user@mail.com', update: jest.fn() });

    await authService.forgotPassword('user@mail.com');

    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('user@mail.com', expect.any(String));
  });

  test('does not send any email when the user does not exist', async () => {
    User.findOne.mockResolvedValue(null);

    await authService.forgotPassword('ghost@mail.com');

    expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

describe('authService verifyEmail', () => {
  afterEach(() => jest.clearAllMocks());

  test('marks the user verified and clears the token', async () => {
    const update = jest.fn();
    User.findOne.mockResolvedValue({ update });

    const result = await authService.verifyEmail('tok-123');

    expect(update).toHaveBeenCalledWith({ is_verified: true, verification_token: null });
    expect(result).toEqual({ message: 'Correo verificado' });
  });

  test('rejects a missing token', async () => {
    await expect(authService.verifyEmail()).rejects.toMatchObject({ statusCode: 400 });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('rejects an unknown or already-used token', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(authService.verifyEmail('nope')).rejects.toMatchObject({ statusCode: 400, message: 'Token inválido o ya utilizado' });
  });
});

describe('authService.register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rechaza un email ya registrado (409)', async () => {
    User.findOne.mockResolvedValue({ id: 'existente' });
    await expect(authService.register({ name: 'Ana', email: 'a@mail.com', password: 'Abcdef12' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('crea un cliente, devuelve tokens y dispara el correo de verificación', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ id: 'u-1', email: 'a@mail.com', role: 'cliente', toSafeJSON: () => ({ id: 'u-1' }) });

    const result = await authService.register({ name: 'Ana', email: 'a@mail.com', password: 'Abcdef12' });

    expect(result).toMatchObject({ user: { id: 'u-1' }, accessToken: 'access-tok', refreshToken: 'refresh-tok' });
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('a@mail.com', expect.any(String));
    expect(WorkerProfile.create).not.toHaveBeenCalled();
  });

  test('crea el WorkerProfile cuando el rol es trabajador', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ id: 'w-1', email: 'w@mail.com', role: 'trabajador', toSafeJSON: () => ({ id: 'w-1' }) });

    await authService.register({ name: 'Beto', email: 'w@mail.com', password: 'Abcdef12', role: 'trabajador', city: 'Medellin' });

    expect(WorkerProfile.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'w-1', cities_covered: ['Medellin'] }));
  });
});

describe('authService.login', () => {
  beforeEach(() => jest.clearAllMocks());

  const activeUser = (overrides = {}) => ({
    id: 'u-1', role: 'cliente', is_active: true,
    comparePassword: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(),
    toSafeJSON: () => ({ id: 'u-1' }),
    ...overrides,
  });

  test('bloquea el login tras demasiados intentos fallidos (429)', async () => {
    redisClient.get.mockResolvedValueOnce('5'); // >= MAX_LOGIN_FAILS
    await expect(authService.login({ email: 'a@mail.com', password: 'x' }))
      .rejects.toMatchObject({ statusCode: 429 });
  });

  test('credenciales incorrectas → 401 e incrementa el contador de fallos', async () => {
    User.findOne.mockResolvedValue(activeUser({ comparePassword: jest.fn().mockResolvedValue(false) }));
    await expect(authService.login({ email: 'a@mail.com', password: 'mala' }))
      .rejects.toMatchObject({ statusCode: 401 });
    expect(redisClient.multi).toHaveBeenCalled();
  });

  test('cuenta desactivada → 403', async () => {
    User.findOne.mockResolvedValue(activeUser({ is_active: false }));
    await expect(authService.login({ email: 'a@mail.com', password: 'Abcdef12' }))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  test('login exitoso: limpia el contador, actualiza last_login y devuelve tokens', async () => {
    const user = activeUser();
    User.findOne.mockResolvedValue(user);

    const result = await authService.login({ email: 'a@mail.com', password: 'Abcdef12' });

    expect(redisClient.del).toHaveBeenCalled();
    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({ last_login: expect.any(Date) }));
    expect(result).toMatchObject({ accessToken: 'access-tok', refreshToken: 'refresh-tok' });
  });
});

describe('authService.refreshTokens', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rechaza un refresh token inválido (401)', async () => {
    jwt.verifyRefreshToken.mockImplementation(() => { throw new Error('bad'); });
    await expect(authService.refreshTokens('malo')).rejects.toMatchObject({ statusCode: 401 });
  });

  test('rechaza una sesión ya revocada en Redis (401)', async () => {
    jwt.verifyRefreshToken.mockReturnValue({ userId: 'u-1', jti: 'j-1' });
    jwt.isRefreshTokenValid.mockResolvedValue(false);
    await expect(authService.refreshTokens('tok')).rejects.toMatchObject({ statusCode: 401 });
  });

  test('rota el token y devuelve uno nuevo en el camino feliz', async () => {
    jwt.verifyRefreshToken.mockReturnValue({ userId: 'u-1', jti: 'j-1' });
    jwt.isRefreshTokenValid.mockResolvedValue(true);
    User.findByPk.mockResolvedValue({ id: 'u-1', role: 'cliente', is_active: true, toSafeJSON: () => ({ id: 'u-1' }) });

    const result = await authService.refreshTokens('tok');

    expect(jwt.revokeRefreshToken).toHaveBeenCalledWith('u-1', 'j-1');
    expect(result).toMatchObject({ accessToken: 'access-tok', refreshToken: 'refresh-tok' });
  });
});

describe('authService.resetPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rechaza un token inexistente (400)', async () => {
    User.findOne.mockResolvedValue(null);
    await expect(authService.resetPassword('nope', 'Nueva123')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rechaza un token expirado (400)', async () => {
    User.findOne.mockResolvedValue({ reset_password_expires: new Date(Date.now() - 1000), update: jest.fn() });
    await expect(authService.resetPassword('viejo', 'Nueva123')).rejects.toMatchObject({ statusCode: 400 });
  });

  test('cambia la contraseña y revoca todas las sesiones', async () => {
    const update = jest.fn().mockResolvedValue();
    User.findOne.mockResolvedValue({ id: 'u-1', reset_password_expires: new Date(Date.now() + 60000), update });

    const result = await authService.resetPassword('valido', 'Nueva123');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ password: 'Nueva123', reset_password_token: null }));
    expect(jwt.revokeAllRefreshTokens).toHaveBeenCalledWith('u-1');
    expect(result).toEqual({ message: 'Contraseña actualizada' });
  });
});
