/**
 * Button — primitivo del design system HOME.
 *
 * Envuelve las clases `.ui-btn-primary` / `.ui-btn-secondary` ya definidas
 * en `src/index.css` (no las reemplaza) y agrega la variante `ghost`, que no
 * existía. Piloto de consumo: ProjectDetailPage.jsx (Fase 1).
 *
 * Accesibilidad: `aria-busy` refleja `loading`; hay un anillo de foco
 * (`focus-visible:ring-*`) visible solo para navegación por teclado (no
 * afecta click/touch); y si `children` no es texto plano (ej. un ícono
 * suelto) sin `aria-label`/`aria-labelledby`, se registra un error en
 * desarrollo — para ese caso es preferible usar `<IconButton>`.
 *
 * @typedef {'primary'|'secondary'|'ghost'} ButtonVariant
 * @typedef {'sm'|'md'} ButtonSize
 * @typedef {Object} ButtonProps
 * @property {ButtonVariant} [variant='primary']
 * @property {ButtonSize} [size='md']
 * @property {boolean} [loading=false] Muestra spinner y deshabilita el botón.
 * @property {boolean} [disabled=false]
 * @property {boolean} [fullWidth=false]
 * @property {import('react').ReactNode} children
 * @property {string} [className]
 * @property {'button'|'submit'|'reset'} [type='button']
 * @property {string} [aria-label] Obligatorio si `children` no es texto plano.
 * @property {string} [aria-labelledby] Alternativa a aria-label.
 */

const SIZE_CLASSES = {
  sm: 'text-sm px-4 py-2',
  md: 'text-[15px] px-6 py-3',
}

const VARIANT_CLASSES = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  ghost: 'bg-transparent text-brand hover:bg-brand-soft rounded-full font-semibold',
}

const SPINNER_CLASSES = {
  primary: 'border-white/40 border-t-white',
  secondary: 'border-border border-t-text',
  ghost: 'border-brand-soft border-t-brand',
}

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV

/** @param {ButtonProps & import('react').ButtonHTMLAttributes<HTMLButtonElement>} props */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  className = '',
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}) {
  const isDisabled = disabled || loading
  const isTextChild = typeof children === 'string'

  if (isDev && !isTextChild && !ariaLabel && !ariaLabelledBy) {
    console.error(
      '[Button] Falta aria-label/aria-labelledby: este botón no tiene texto plano como ' +
      'contenido, así que un lector de pantalla no puede anunciarlo. Si es un botón de ' +
      'solo ícono, considera usar <IconButton> en su lugar.'
    )
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={[
        'inline-flex items-center justify-center gap-2',
        'transition-opacity duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-60 cursor-not-allowed' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className={`w-4 h-4 rounded-full border-2 animate-spin ${SPINNER_CLASSES[variant]}`}
        />
      )}
      {children}
    </button>
  )
}
