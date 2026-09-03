// Smoke tests del flujo de autenticación (login / register / logout) a nivel
// del store de Zustand, sin renderizar pantallas. Mockea el servicio de auth
// y AsyncStorage (mock oficial vía moduleNameMapper).

jest.mock('../src/services', () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    getMe: jest.fn(),
    oauthSignIn: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/context/authStore';
import { authService } from '../src/services';

const reset = () =>
  useAuthStore.setState({
    user: null, accessToken: null, refreshToken: null,
    isLoading: false, isAuthenticated: false, needsWorkerOnboarding: false,
  });

const store = () => useAuthStore.getState();

// fetchMe dispara logout() sin await (fire-and-forget); drenamos las microtareas.
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  reset();
});

describe('authStore.login', () => {
  test('éxito: guarda tokens, marca autenticado y devuelve el rol', async () => {
    authService.login.mockResolvedValue({
      data: { data: { user: { id: 'u1', role: 'cliente' }, accessToken: 'acc', refreshToken: 'ref' } },
    });

    const res = await store().login('a@y.com', 'secret');

    expect(res).toEqual({ success: true, role: 'cliente' });
    expect(store().isAuthenticated).toBe(true);
    expect(store().user).toEqual({ id: 'u1', role: 'cliente' });
    expect(store().isLoading).toBe(false);
    expect(await AsyncStorage.getItem('accessToken')).toBe('acc');
    expect(await AsyncStorage.getItem('refreshToken')).toBe('ref');
  });

  test('fallo: no autentica, apaga el loading y devuelve el mensaje del backend', async () => {
    authService.login.mockRejectedValue({ response: { data: { message: 'Credenciales inválidas' } } });

    const res = await store().login('a@y.com', 'mala');

    expect(res).toEqual({ success: false, message: 'Credenciales inválidas' });
    expect(store().isAuthenticated).toBe(false);
    expect(store().isLoading).toBe(false);
    expect(await AsyncStorage.getItem('accessToken')).toBeNull();
  });

  test('fallo sin mensaje del backend: usa el texto por defecto', async () => {
    authService.login.mockRejectedValue(new Error('network'));
    const res = await store().login('a@y.com', 'x');
    expect(res).toEqual({ success: false, message: 'Error al iniciar sesión' });
  });
});

describe('authStore.register', () => {
  test('trabajador nuevo queda pendiente de onboarding', async () => {
    authService.register.mockResolvedValue({
      data: { data: { user: { id: 'w1', role: 'trabajador' }, accessToken: 'a', refreshToken: 'r' } },
    });

    const res = await store().register({ name: 'Carlos' });

    expect(res).toEqual({ success: true, role: 'trabajador' });
    expect(store().needsWorkerOnboarding).toBe(true);
    expect(store().isAuthenticated).toBe(true);
  });

  test('cliente nuevo NO requiere onboarding', async () => {
    authService.register.mockResolvedValue({
      data: { data: { user: { id: 'c1', role: 'cliente' }, accessToken: 'a', refreshToken: 'r' } },
    });

    await store().register({ name: 'Ana' });

    expect(store().needsWorkerOnboarding).toBe(false);
  });
});

describe('authStore.logout', () => {
  test('limpia estado y storage, incluso si el logout del backend falla', async () => {
    await AsyncStorage.setItem('accessToken', 'acc');
    await AsyncStorage.setItem('refreshToken', 'ref');
    useAuthStore.setState({ user: { id: 'u1' }, accessToken: 'acc', refreshToken: 'ref', isAuthenticated: true });
    authService.logout.mockRejectedValue(new Error('offline')); // no debe romper el logout local

    await store().logout();

    expect(store().isAuthenticated).toBe(false);
    expect(store().user).toBeNull();
    expect(store().accessToken).toBeNull();
    expect(await AsyncStorage.getItem('accessToken')).toBeNull();
    expect(await AsyncStorage.getItem('refreshToken')).toBeNull();
  });
});

describe('authStore.fetchMe', () => {
  test('éxito: refresca el usuario en el store', async () => {
    authService.getMe.mockResolvedValue({ data: { data: { user: { id: 'u1', name: 'Ana' } } } });

    await store().fetchMe();

    expect(store().user).toEqual({ id: 'u1', name: 'Ana' });
  });

  test('fallo: cierra sesión (sesión inválida)', async () => {
    useAuthStore.setState({ user: { id: 'u1' }, isAuthenticated: true, accessToken: 'acc' });
    authService.getMe.mockRejectedValue(new Error('401'));

    await store().fetchMe();
    await flush();

    expect(store().isAuthenticated).toBe(false);
    expect(store().user).toBeNull();
  });
});
