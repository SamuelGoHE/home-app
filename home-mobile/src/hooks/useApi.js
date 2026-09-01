import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

/**
 * Fetch paginado con scroll infinito. Consume el envelope del backend
 * `{ data: [...], pagination: { page, totalPages, hasNext, ... } }` y va
 * acumulando páginas. Pensado para FlatList (onEndReached -> loadMore).
 *
 * @param {string} url            endpoint
 * @param {object} params         query estático (sin page/pageSize)
 * @param {Array}  deps           dependencias que reinician la paginación (ej. filtros)
 * @param {number} pageSize       tamaño de página
 */
export function useInfiniteFetch(url, params = {}, deps = [], pageSize = 20) {
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)      // carga inicial / reinicio
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  // Token para descartar respuestas obsoletas cuando cambian los filtros.
  const reqToken = useRef(0)
  const paramsKey = JSON.stringify(params)

  const fetchPage = useCallback(async (page, append) => {
    if (!url) { setLoading(false); return }
    const token = ++reqToken.current
    append ? setLoadingMore(true) : setLoading(true)
    setError(null)
    try {
      const res = await api.get(url, { params: { ...params, page, pageSize } })
      if (token !== reqToken.current) return // llegó tarde: hay una petición más nueva
      const rows = Array.isArray(res.data.data) ? res.data.data : []
      setPagination(res.data.pagination || null)
      setItems(prev => (append ? [...prev, ...rows] : rows))
    } catch (err) {
      if (token !== reqToken.current) return
      setError(err.response?.data?.message || 'Error cargando datos')
    } finally {
      if (token === reqToken.current) { append ? setLoadingMore(false) : setLoading(false) }
    }
  }, [url, paramsKey, pageSize])

  // Reinicia a la primera página cuando cambian los filtros.
  useEffect(() => { fetchPage(1, false) }, [fetchPage, ...deps])

  const hasMore = pagination ? pagination.hasNext : false

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return
    fetchPage((pagination?.page || 1) + 1, true)
  }, [loading, loadingMore, hasMore, pagination, fetchPage])

  const refetch = useCallback(() => fetchPage(1, false), [fetchPage])

  return { data: items, pagination, loading, loadingMore, error, hasMore, loadMore, refetch }
}

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
  // La pantalla de Proyectos mezcla proyectos + cotizaciones con búsqueda
  // client-side, así que pedimos un page grande (acotado por el máx del backend)
  // en vez de scroll infinito. Suficiente para los volúmenes de la beta.
  const result = useFetch('/projects', { pageSize: 100 })
  return { ...result, data: Array.isArray(result.data) ? result.data : result.data?.projects ?? null }
}

export function useProject(id) {
  const result = useFetch(id ? `/projects/${id}` : null)
  return { ...result, data: result.data?.project ?? result.data ?? null }
}

export function useMyQuotes() {
  // Igual que useProjects: page grande acotado (se combina con proyectos en la
  // misma pantalla con filtro client-side).
  const result = useFetch('/quotes/me', { pageSize: 100 })
  return { ...result, data: Array.isArray(result.data) ? result.data : result.data?.quotes ?? null }
}

export function useWorkers(city = null, specialty = null) {
  const params = {}
  if (city) params.city = city
  if (specialty) params.specialty = specialty
  // Resultados de búsqueda: lista de alto volumen → scroll infinito real.
  return useInfiniteFetch('/users/workers', params, [city, specialty])
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

export function usePayoutAccount() {
  const result = useFetch('/users/me/payout-account')
  return { ...result, data: result.data ?? null }
}

export function useConversations() {
  const result = useFetch('/messages/conversations')
  return { ...result, data: Array.isArray(result.data) ? result.data : null }
}