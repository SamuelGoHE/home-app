/**
 * Badge — primitivo de tono semántico del design system HOME.
 *
 * `StatusBadge` (en `components/common/index.jsx`) se reconstruye sobre
 * este primitivo en vez de mantener su propio mapa de colores — así hay un
 * solo lugar (`design-system/status.js` + este archivo) que decide qué
 * color le corresponde a cada tono.
 *
 * @typedef {'neutral'|'info'|'warning'|'caution'|'success'|'error'} BadgeTone
 * @typedef {Object} BadgeProps
 * @property {BadgeTone} [tone='neutral']
 * @property {import('react').ReactNode} children
 * @property {string} [className]
 */

const TONE_CLASSES = {
  neutral: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-orange-100 text-orange-700',
  caution: 'bg-yellow-100 text-yellow-700',
  success: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-600',
}

/** @param {BadgeProps} props */
export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={[
        'inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full',
        TONE_CLASSES[tone],
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  )
}
