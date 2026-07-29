import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useMyQuotes, useProjects } from './useApi'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'home-dismissed-notifs'

async function getDismissed() {
  const data = await AsyncStorage.getItem(STORAGE_KEY)
  try { return JSON.parse(data) ?? [] } catch { return [] }
}

export function useNotifications() {
  const { data: quotes, refetch: refetchQuotes } = useMyQuotes()
  const { data: projects, refetch: refetchProjects } = useProjects()
  const [dismissed, setDismissed] = useState([])
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    getDismissed().then(setDismissed)
  }, [])

  // Polling cada 10 segundos
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      refetchQuotes()
      refetchProjects()
    }, 10000)
    return () => clearInterval(pollIntervalRef.current)
  }, [refetchQuotes, refetchProjects])

  const notifications = useMemo(() => {
    const list = []

    if (quotes) {
      quotes.forEach(q => {
        if (q.status === 'solicitud_pendiente') {
          list.push({ id: `quote-pending-${q.id}`, type: 'quote_pending', title: 'Solicitud enviada ⏳', message: `Tu solicitud para "${q.service?.name || 'Servicio'}" está esperando respuesta del trabajador.`, time: new Date(q.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), read: false, dateObj: new Date(q.createdAt) })
        } else if (q.status === 'aceptada') {
          list.push({ id: `quote-approved-${q.id}`, type: 'quote_approved', title: '¡Solicitud Aceptada! 🎉', message: `El trabajador aceptó tu solicitud de "${q.service?.name}". Ya puedes ver el proyecto.`, time: new Date(q.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), read: false, dateObj: new Date(q.updatedAt) })
        } else if (q.status === 'rechazada') {
          list.push({ id: `quote-rejected-${q.id}`, type: 'quote_rejected', title: 'Solicitud Rechazada', message: `El trabajador no pudo tomar tu solicitud de "${q.service?.name}". Puedes elegir otro profesional.`, time: new Date(q.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), read: false, dateObj: new Date(q.updatedAt) })
        }
      })
    }

    if (projects) {
      projects.forEach(p => {
        if (p.status === 'en_progreso' || p.status === 'aprobado') {
          list.push({ id: `project-active-${p.id}`, type: 'project_active', title: 'Proyecto Activo', message: `Tienes un proyecto de "${p.service?.name}" en curso. Revisa el progreso.`, time: new Date(p.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), read: true, dateObj: new Date(p.updatedAt) })
        } else if (p.status === 'completada' || p.status === 'completado') {
          list.push({ id: `project-completed-${p.id}`, type: 'project_completed', title: 'Proyecto Completado ⭐️', message: `Tu proyecto "${p.title || p.service?.name}" ha finalizado. ¡Entra y califica el servicio!`, time: new Date(p.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), read: false, dateObj: new Date(p.updatedAt) })
        }
      })
    }

    return list.sort((a, b) => b.dateObj - a.dateObj)
  }, [quotes, projects])

  const visibleNotifications = useMemo(
    () => notifications.filter(n => !dismissed.includes(n.id)),
    [notifications, dismissed]
  )

  const hasUnreadNotifs = useMemo(
    () => visibleNotifications.some(n => !n.read),
    [visibleNotifications]
  )

  const dismiss = useCallback(async (id) => {
    const next = [...dismissed, id]
    setDismissed(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [dismissed])

  const dismissAll = useCallback(async () => {
    const ids = visibleNotifications.map(n => n.id)
    const next = [...dismissed, ...ids]
    setDismissed(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [visibleNotifications, dismissed])

  return { notifications: visibleNotifications, hasUnreadNotifs, dismiss, dismissAll }
}
