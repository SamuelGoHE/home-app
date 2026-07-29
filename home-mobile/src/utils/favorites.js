import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_SERVICES = 'home-favorite-services'
const KEY_WORKERS = 'home-favorite-workers'

function safeParse(value, fallback) {
  try { return JSON.parse(value) ?? fallback } catch { return fallback }
}

export async function getFavoriteServices() {
  const data = await AsyncStorage.getItem(KEY_SERVICES)
  return safeParse(data, [])
}

export async function isServiceFavorite(serviceId) {
  const services = await getFavoriteServices()
  return services.some((s) => s.id === serviceId)
}

export async function toggleFavoriteService(service) {
  const current = await getFavoriteServices()
  const exists = current.some((s) => s.id === service.id)
  const next = exists
    ? current.filter((s) => s.id !== service.id)
    : [...current, {
        id: service.id,
        name: service.name,
        category: service.category,
        image_url: service.image_url || null,
      }]

  await AsyncStorage.setItem(KEY_SERVICES, JSON.stringify(next))
  return { isFavorite: !exists, favorites: next }
}

export async function getFavoriteWorkers() {
  const data = await AsyncStorage.getItem(KEY_WORKERS)
  return safeParse(data, [])
}

export async function isWorkerFavorite(workerId) {
  const workers = await getFavoriteWorkers()
  return workers.some((w) => w.id === workerId)
}

export async function toggleFavoriteWorker(worker) {
  const current = await getFavoriteWorkers()
  const exists = current.some((w) => w.id === worker.id)
  const next = exists
    ? current.filter((w) => w.id !== worker.id)
    : [...current, {
        id: worker.id,
        name: worker.name,
        avatar: worker.avatar || null,
        city: worker.city || null,
        rating_avg: worker.rating_avg || null,
        rating_count: worker.rating_count || 0,
      }]

  await AsyncStorage.setItem(KEY_WORKERS, JSON.stringify(next))
  return { isFavorite: !exists, favorites: next }
}
