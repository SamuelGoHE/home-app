import { useMemo } from 'react'
import { useMyQuotes, useProjects } from './useApi'
import { getDismissed } from '../components/notifications/NotificationsPanel'

export function useNotifications() {
  const { data: quotes } = useMyQuotes()
  const { data: projects } = useProjects()

  const notifications = useMemo(() => {
    const list = []
    
    if (quotes) {
      quotes.forEach(q => {
        if (q.status === 'solicitud_pendiente') {
          list.push({ id: `quote-pending-${q.id}`, type: 'quote_pending', title: 'Solicitud enviada ⏳', message: `Tu solicitud para "${q.service?.name || 'Servicio'}" está esperando respuesta del trabajador.`, time: new Date(q.createdAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), path: '/home', read: false, dateObj: new Date(q.createdAt) })
        } else if (q.status === 'aceptada') {
          list.push({ id: `quote-approved-${q.id}`, type: 'quote_approved', title: '¡Solicitud Aceptada! 🎉', message: `El trabajador aceptó tu solicitud de "${q.service?.name}". Ya puedes ver el proyecto.`, time: new Date(q.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), path: q.project ? `/projects/${q.project.id}` : '/projects', read: false, dateObj: new Date(q.updatedAt) })
        } else if (q.status === 'rechazada') {
          list.push({ id: `quote-rejected-${q.id}`, type: 'quote_rejected', title: 'Solicitud Rechazada', message: `El trabajador no pudo tomar tu solicitud de "${q.service?.name}". Puedes elegir otro profesional.`, time: new Date(q.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), path: '/results', read: false, dateObj: new Date(q.updatedAt) })
        }
      })
    }

    if (projects) {
      projects.forEach(p => {
        if (p.status === 'en_progreso' || p.status === 'aprobado') {
          list.push({ id: `project-active-${p.id}`, type: 'project_active', title: 'Proyecto Activo', message: `Tienes un proyecto de "${p.service?.name}" en curso. Revisa el progreso.`, time: new Date(p.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), path: `/projects/${p.id}`, read: true, dateObj: new Date(p.updatedAt) })
        } else if (p.status === 'completada' || p.status === 'completado') {
          list.push({ id: `project-completed-${p.id}`, type: 'project_completed', title: 'Proyecto Completado ⭐️', message: `Tu proyecto "${p.title || p.service?.name}" ha finalizado. ¡Entra y califica el servicio!`, time: new Date(p.updatedAt).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' }), path: `/projects/${p.id}`, read: false, dateObj: new Date(p.updatedAt) })
        }
      })
    }

    return list.sort((a, b) => b.dateObj - a.dateObj)
  }, [quotes, projects])

  const hasUnreadNotifs = useMemo(() => {
    const dismissed = getDismissed()
    return notifications.some(n => !n.read && !dismissed.includes(n.id))
  }, [notifications])

  return { notifications, hasUnreadNotifs }
}
