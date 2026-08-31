jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
}));

jest.mock('../src/utils/jwt', () => ({
  generateTokens: jest.fn(),
  saveRefreshToken: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllRefreshTokens: jest.fn(),
  blacklistAccessToken: jest.fn(),
}));

jest.mock('../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ sent: true }),
  sendVerificationEmail: jest.fn().mockResolvedValue({ sent: true }),
}));

const authService = require('../src/services/authService');
const emailService = require('../src/services/emailService');
const { User } = require('../src/models');

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
