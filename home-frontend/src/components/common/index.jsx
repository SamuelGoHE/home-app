import { AlertTriangle, Inbox } from 'lucide-react'

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
        {typeof icon === 'string' ? <Inbox size={20} className="text-gray-500" /> : icon}
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

// Badge de estado de proyecto
const STATUS_CONFIG = {
  pendiente:    { label: 'Pendiente',    bg: 'bg-gray-100',    text: 'text-gray-600' },
  en_revision:  { label: 'En revisión',  bg: 'bg-yellow-100',  text: 'text-yellow-700' },
  aprobado:     { label: 'Aprobado',     bg: 'bg-blue-100',    text: 'text-blue-700' },
  en_progreso:  { label: 'En progreso',  bg: 'bg-orange-100',  text: 'text-orange-700' },
  pausado:      { label: 'Pausado',      bg: 'bg-gray-100',    text: 'text-gray-500' },
  completado:   { label: 'Completado',   bg: 'bg-green-100',   text: 'text-green-700' },
  cancelado:    { label: 'Cancelado',    bg: 'bg-red-100',     text: 'text-red-600' },
  // Tareas
  en_progreso_t:{ label: 'En progreso',  bg: 'bg-orange-100',  text: 'text-orange-700' },
  completada:   { label: 'Completada',   bg: 'bg-green-100',   text: 'text-green-700' },
  bloqueada:    { label: 'Bloqueada',    bg: 'bg-red-100',     text: 'text-red-600' },
}

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
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
