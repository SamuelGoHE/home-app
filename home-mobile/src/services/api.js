import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../utils/apiUrl'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Adjuntar token en cada petición (ahora es asíncrono en RN)
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refrescar token si expira
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original?._retry) {
      const refreshToken = await AsyncStorage.getItem('refreshToken')
      if (!refreshToken) {
        await AsyncStorage.removeItem('accessToken')
        await AsyncStorage.removeItem('refreshToken')
        return Promise.reject(error)
      }

      original._retry = true
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
        await AsyncStorage.setItem('accessToken', data.data.accessToken)
        await AsyncStorage.setItem('refreshToken', data.data.refreshToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        await AsyncStorage.removeItem('accessToken')
        await AsyncStorage.removeItem('refreshToken')
      }
    }
    return Promise.reject(error)
  }
)

export default api
