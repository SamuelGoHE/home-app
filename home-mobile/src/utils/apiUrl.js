import Constants from 'expo-constants'

const API_PORT = 3000

/**
 * Detecta automáticamente la IP LAN del backend a partir del host desde el
 * que Metro sirvió el bundle (Constants.expoConfig.hostUri, ej: "172.20.10.6:8081").
 * Así no hay que hardcodear ni actualizar la IP cada vez que cambia de red.
 * Se puede forzar con EXPO_PUBLIC_API_URL si hace falta apuntar a otro lado.
 */
function detectApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }

  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost
  const host = hostUri?.split(':')?.[0]

  if (host) {
    return `http://${host}:${API_PORT}/api`
  }

  return `http://localhost:${API_PORT}/api`
}

export const API_URL = detectApiUrl()
export const SOCKET_URL = API_URL.replace('/api', '')
