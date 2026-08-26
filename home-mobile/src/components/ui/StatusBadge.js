import { getStatus } from '../../design-system/status.js'
import { Badge } from './Badge.js'

/**
 * StatusBadge — mobile no tenía ninguna versión centralizada de esto; cada
 * pantalla (HomeScreen, WorkerHomeScreen, Projectdetailscreen, Projectsscreen)
 * definía su propio STATUS_UI local, con colores que ya divergían de los de
 * web en al menos un caso ("en_progreso" naranja en web vs. azul en
 * WorkerDashboard). Este componente y `design-system/status.js` son el
 * reemplazo único. Ninguna pantalla lo consume todavía.
 *
 * @param {{ status: string }} props
 */
export function StatusBadge({ status }) {
  const { label, tone } = getStatus(status)
  return <Badge tone={tone}>{label}</Badge>
}
