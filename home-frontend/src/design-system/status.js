/**
 * HOME — mapa semántico único de estados (proyecto/tarea).
 *
 * Reemplaza los mapas STATUS_UI/STATUS_CONFIG que hoy están duplicados y
 * divergen entre archivos (components/common/index.jsx, WorkerDashboard.jsx,
 * ProjectDetailPage.jsx/ProjectsPage.jsx, AdminDashboard.jsx). Ningún archivo
 * existente se migró todavía a este mapa en esta fase — eso ocurre en la
 * migración, no aquí.
 *
 * ESPEJO: este archivo debe mantenerse idéntico a
 * `home-mobile/src/design-system/status.js`. No se pudo compartir por import
 * directo porque un import de runtime que cruce la raíz de `home-frontend/`
 * chocaría con `Vite server.fs.allow` — ver `design-system/tokens.js` (raíz
 * del repo) para el razonamiento completo y la fuente canónica documentada.
 *
 * `tone` es uno de los 5 tonos semánticos definidos en
 * design-system/tokens.js#colors ('neutral'|'info'|'warning'|'success'|'error'),
 * más 'caution' (amarillo): el StatusBadge existente en
 * `components/common/index.jsx` distinguía visualmente "en_revision"
 * (amarillo) de "en_progreso" (naranja) — para cumplir "cero cambio visual"
 * al re-cablear ese componente en esta fase, se preserva esa distinción en
 * vez de forzar ambos estados al mismo tono 'warning'.
 */

/** @typedef {'neutral'|'info'|'warning'|'caution'|'success'|'error'} Tone */
/** @typedef {{ label: string, tone: Tone }} StatusEntry */

/** @type {Record<string, StatusEntry>} */
export const STATUS_MAP = {
  pendiente: { label: 'Pendiente', tone: 'neutral' },
  en_revision: { label: 'En revisión', tone: 'caution' },
  aprobado: { label: 'Aprobado', tone: 'info' },
  en_progreso: { label: 'En progreso', tone: 'warning' },
  pausado: { label: 'Pausado', tone: 'neutral' },
  completado: { label: 'Completado', tone: 'success' },
  cancelado: { label: 'Cancelado', tone: 'error' },
  // Tareas
  en_progreso_t: { label: 'En progreso', tone: 'warning' },
  completada: { label: 'Completada', tone: 'success' },
  bloqueada: { label: 'Bloqueada', tone: 'error' },
  // Antes solo existían (en violeta, sin equivalente en ningún otro mapa) en
  // home-mobile/src/screens/Projectsscreen.js — se consolidan aquí a los 5
  // tonos semánticos en vez de introducir un 6º tono para dos etiquetas.
  solicitud_pendiente: { label: 'Solicitud pendiente', tone: 'neutral' },
  rechazada: { label: 'Rechazada', tone: 'error' },
}

export const DEFAULT_STATUS = 'pendiente'

/** @param {string} status @returns {StatusEntry} */
export function getStatus(status) {
  return STATUS_MAP[status] || STATUS_MAP[DEFAULT_STATUS]
}
