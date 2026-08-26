/**
 * HOME — mapa semántico único de estados (proyecto/tarea).
 *
 * Reemplaza los mapas STATUS_UI que hoy están duplicados y divergen entre
 * pantallas (HomeScreen.js, WorkerHomeScreen.js, Projectdetailscreen.js,
 * Projectsscreen.js). Ninguna pantalla existente se migró todavía a este
 * mapa en esta fase — eso ocurre en la migración, no aquí.
 *
 * ESPEJO: este archivo debe mantenerse idéntico a
 * `home-frontend/src/design-system/status.js`. No se pudo compartir por
 * import directo porque un import de runtime que cruce la raíz de
 * `home-mobile/` chocaría con `Metro watchFolders` — ver
 * `design-system/tokens.js` (raíz del repo) para el razonamiento completo y
 * la fuente canónica documentada.
 *
 * `tone` es uno de los 5 tonos semánticos definidos en
 * design-system/tokens.js#colors ('neutral'|'info'|'warning'|'success'|'error'),
 * más 'caution' (amarillo): preserva la distinción visual que ya existía en
 * web entre "en_revision" (amarillo) y "en_progreso" (naranja), para que el
 * mapa sea idéntico en ambas plataformas desde el día 1 de la migración.
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
  // src/screens/Projectsscreen.js — se consolidan aquí a los 5 tonos
  // semánticos en vez de introducir un 6º tono para dos etiquetas.
  solicitud_pendiente: { label: 'Solicitud pendiente', tone: 'neutral' },
  rechazada: { label: 'Rechazada', tone: 'error' },
}

export const DEFAULT_STATUS = 'pendiente'

/** @param {string} status @returns {StatusEntry} */
export function getStatus(status) {
  return STATUS_MAP[status] || STATUS_MAP[DEFAULT_STATUS]
}
