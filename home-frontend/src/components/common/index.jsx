import { AlertTriangle, Inbox } from 'lucide-react'
import { getStatus } from '../../design-system/status.js'
import { Badge } from '../ui/Badge.jsx'

// Skeleton de tarjeta
export function CardSkeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200/80 rounded-2xl ${className}`} />
  )
}

// Skeleton de fila horizontal (categorías)
export function RowSkeleton({ count = 5 }) {
  return (
    <div className="flex overflow-x-auto gap-4 px-4 sm:px-6 pb-2 no-scrollbar">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-none w-[110px] flex flex-col items-center gap-2.5">
          <div className="w-full aspect-square rounded-3xl bg-gray-200 animate-pulse" />
          <div className="w-16 h-3 rounded bg-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// Estado vacío
export function EmptyState({ icon = '📭', title, subtitle, action, onAction }) {
  return (
    <div className="ui-card-soft flex flex-col items-center justify-center py-14 px-8 text-center">
      <div className="w-11 h-11 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-3">
        {typeof icon === 'string' ? (
          // Fix: antes esta rama nunca se alcanzaba en la práctica porque el
          // chequeo de tipo caía siempre en <Inbox>, así que el emoji que
          // cada pantalla pasaba (ej. icon="🔍" en ServicesScreen) nunca se
          // renderizaba.
          <span aria-hidden="true" className="text-xl leading-none">{icon}</span>
        ) : icon != null ? (
          icon
        ) : (
          <Inbox size={20} className="text-gray-500" />
        )}
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mb-6 max-w-xs">{subtitle}</p>}
      {action && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 ui-btn-primary text-sm"
        >
          {action}
        </button>
      )}
    </div>
  )
}

// Estado de error
export function ErrorState({ message, onRetry }) {
  return (
    <div className="ui-card-soft flex flex-col items-center justify-center py-12 px-8 text-center">
      <div className="w-11 h-11 rounded-xl bg-white border border-red-100 flex items-center justify-center mb-3">
        <AlertTriangle size={20} className="text-red-500" />
      </div>
      <p className="text-sm text-gray-600 mb-4">{message || 'Algo salió mal'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 ui-btn-secondary text-sm"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

// Badge de estado de proyecto — la fuente de verdad del mapa vive ahora en
// design-system/status.js (compartida conceptualmente con home-mobile) en
// vez de un STATUS_CONFIG local. Mismo output visual que antes para los 10
// estados ya en uso; ver design-system/status.js para el detalle de tonos.
export function StatusBadge({ status }) {
  const { label, tone } = getStatus(status)
  return <Badge tone={tone}>{label}</Badge>
}

// Badge de prioridad
const PRIORITY_CONFIG = {
  baja:    { label: 'Baja',    color: 'text-gray-400' },
  media:   { label: 'Media',   color: 'text-blue-500' },
  alta:    { label: 'Alta',    color: 'text-orange-500' },
  urgente: { label: 'Urgente', color: 'text-red-600' },
}

export function PriorityDot({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.media
  return (
    <span className={`text-[11px] font-bold ${cfg.color}`}>● {cfg.label}</span>
  )
}
