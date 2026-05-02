jest.mock('../src/models', () => ({
  User: { findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() },
}));

jest.mock('../src/utils/jwt', () => ({
  generateTokens: jest.fn(),
  saveRefreshToken: jest.fn(),
  getStoredRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  blacklistAccessToken: jest.fn(),
}));

const authService = require('../src/services/authService');
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
});
