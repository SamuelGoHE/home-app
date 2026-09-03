// Smoke tests del cliente HTTP compartido: adjuntar el token en cada request
// y el manejo de 401 (base de todos los flujos autenticados). Ejercemos los
// handlers de interceptor directamente, sin red real.

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api';

const requestFulfilled = api.interceptors.request.handlers[0].fulfilled;
const responseRejected = api.interceptors.response.handlers[0].rejected;

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('api — interceptor de request', () => {
  test('adjunta el access token como Bearer cuando existe', async () => {
    await AsyncStorage.setItem('accessToken', 'abc123');
    const config = await requestFulfilled({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer abc123');
  });

  test('no agrega Authorization si no hay token', async () => {
    const config = await requestFulfilled({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});

describe('api — interceptor de response (401)', () => {
  test('sin refresh token: limpia el storage y propaga el error', async () => {
    await AsyncStorage.setItem('accessToken', 'viejo');
    const error = { response: { status: 401 }, config: {} };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(await AsyncStorage.getItem('accessToken')).toBeNull();
    expect(await AsyncStorage.getItem('refreshToken')).toBeNull();
  });

  test('un error no-401 se propaga sin tocar el storage', async () => {
    await AsyncStorage.setItem('accessToken', 'sigue-vivo');
    const error = { response: { status: 500 }, config: {} };

    await expect(responseRejected(error)).rejects.toBe(error);
    expect(await AsyncStorage.getItem('accessToken')).toBe('sigue-vivo');
  });

  test('no reintenta dos veces la misma petición (_retry)', async () => {
    const error = { response: { status: 401 }, config: { _retry: true } };
    // Con _retry ya marcado, el interceptor no intenta refrescar: solo propaga.
    await expect(responseRejected(error)).rejects.toBe(error);
  });
});
