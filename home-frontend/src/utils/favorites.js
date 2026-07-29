// ─── Servicios favoritos ──────────────────────────────────────────
const KEY_SERVICES = 'home-favorite-services'

function safeParse(value, fallback) {
  try { return JSON.parse(value) ?? fallback } catch { return fallback }
}

export function getFavoriteServices() {
  return safeParse(localStorage.getItem(KEY_SERVICES), [])
}

export function isServiceFavorite(serviceId) {
  return getFavoriteServices().some((s) => s.id === serviceId)
}

export function toggleFavoriteService(service) {
  const current = getFavoriteServices()
  const exists = current.some((s) => s.id === service.id)
  const next = exists
    ? current.filter((s) => s.id !== service.id)
    : [...current, {
        id: service.id,
        name: service.name,
        category: service.category,
        image_url: service.image_url || null,
      }]

  localStorage.setItem(KEY_SERVICES, JSON.stringify(next))
  return { isFavorite: !exists, favorites: next }
}

// ─── Trabajadores favoritos ───────────────────────────────────────
const KEY_WORKERS = 'home-favorite-workers'

export function getFavoriteWorkers() {
  return safeParse(localStorage.getItem(KEY_WORKERS), [])
}

export function isWorkerFavorite(workerId) {
  return getFavoriteWorkers().some((w) => w.id === workerId)
}

export function toggleFavoriteWorker(worker) {
  const current = getFavoriteWorkers()
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

  localStorage.setItem(KEY_WORKERS, JSON.stringify(next))
  return { isFavorite: !exists, favorites: next }
}
