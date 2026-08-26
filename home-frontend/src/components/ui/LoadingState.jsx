/**
 * LoadingState — primitivo del design system HOME.
 *
 * Consolida el patrón "spinner + texto opcional" que hoy cada pantalla
 * reimplementa a mano con estilos distintos (WorkerDashboard: "Sincronizando
 * App...", ChatScreen: "Cargando historial...", WorkerDetailPage: spinner
 * solo, sin texto). Ninguna pantalla lo consume todavía.
 *
 * @typedef {Object} LoadingStateProps
 * @property {string} [message] Texto opcional bajo el spinner.
 * @property {boolean} [fullScreen=false] Centra en toda la altura del viewport en vez de ocupar solo su contenedor.
 * @property {string} [className]
 */

/** @param {LoadingStateProps} props */
export function LoadingState({ message, fullScreen = false, className = '' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex flex-col items-center justify-center gap-3 py-12',
        fullScreen ? 'min-h-screen' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      <span
        aria-hidden="true"
        className="w-8 h-8 rounded-full border-[3px] border-border border-t-brand animate-spin"
      />
      {message && <p className="text-caption text-muted">{message}</p>}
    </div>
  )
}
