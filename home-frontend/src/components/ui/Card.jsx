/**
 * Card — primitivo del design system HOME.
 *
 * Envuelve `.ui-card` / `.ui-card-soft` (ya definidas en `src/index.css`) en
 * un componente, para reemplazar los `rounded-2xl/3xl/[28px] border ...`
 * inline que hoy repite cada pantalla. Ninguna pantalla lo consume todavía.
 *
 * @typedef {'default'|'soft'} CardVariant
 * @typedef {'none'|'sm'|'md'|'lg'} CardPadding
 * @typedef {Object} CardProps
 * @property {CardVariant} [variant='default']
 * @property {CardPadding} [padding='md']
 * @property {import('react').ReactNode} children
 * @property {string} [className]
 */

const VARIANT_CLASSES = {
  default: 'ui-card',
  soft: 'ui-card-soft',
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

/** @param {CardProps & import('react').HTMLAttributes<HTMLDivElement>} props */
export function Card({ variant = 'default', padding = 'md', className = '', children, ...rest }) {
  return (
    <div
      className={[VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
