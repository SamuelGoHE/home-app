import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export function useFetch(url, params = {}, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!url) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url, { params })
      setData(res.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [url, JSON.stringify(params)])

  useEffect(() => { fetch() }, [fetch, ...deps])

  return { data, loading, error, refetch: fetch }
}

export function useServices(category = null) {
  const params = category ? { category } : {}
  const result = useFetch('/services', params, [category])
  // El backend devuelve array directo (no envuelto en objeto)
  return { ...result, data: Array.isArray(result.data) ? result.data : result.data?.services ?? null }
}

export function useProjects() {
  const result = useFetch('/projects')
  return { ...result, data: Array.isArray(result.data) ? result.data : result.data?.projects ?? null }
}

export function useProject(id) {
  const result = useFetch(id ? `/projects/${id}` : null)
  return { ...result, data: result.data?.project ?? result.data ?? null }
}

export function useMyQuotes() {
  const result = useFetch('/quotes/me')
  return { ...result, data: Array.isArray(result.data) ? result.data : result.data?.quotes ?? null }
}

export function useWorkers(city = null, specialty = null) {
  const params = {}
  if (city) params.city = city
  if (specialty) params.specialty = specialty
  const result = useFetch('/users/workers', params, [city, specialty])
  return { ...result, data: Array.isArray(result.data) ? result.data : null }
}

export function useWorker(id) {
  const result = useFetch(id ? `/users/workers/${id}` : null)
  return { ...result, data: result.data ?? null }
}

export function useRecentRatings(limit = 6) {
  const result = useFetch('/ratings/recent', { limit }, [limit])
  return { ...result, data: Array.isArray(result.data) ? result.data : null }
}

export function useProjectPhotos(projectId) {
  const result = useFetch(projectId ? `/projects/${projectId}/photos` : null, {}, [projectId])
  return { ...result, data: Array.isArray(result.data) ? result.data : null }
}

export function usePayments(projectId) {
  const result = useFetch(projectId ? `/payments/${projectId}` : null, {}, [projectId])
  return { ...result, data: Array.isArray(result.data) ? result.data : null }
}

export function useConversations() {
  const result = useFetch('/messages/conversations')
  return { ...result, data: Array.isArray(result.data) ? result.data : null }
}