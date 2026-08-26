/**
 * IconButton — primitivo del design system HOME (web).
 *
 * Mismo concepto que `home-mobile/src/components/ui/IconButton.js`: base
 * única para todo botón de solo-ícono (volver, cerrar, chat, favorito), con
 * área táctil mínima de 44×44 garantizada (`w-11 h-11` = 2.75rem, valor
 * nativo de la escala de Tailwind, no un token nuevo) y `aria-label`
 * obligatorio — sin él, se registra un error en desarrollo en vez de fallar
 * en silencio. Reemplaza el patrón de `<Button variant="ghost" size="sm">`
 * + overrides `!px-2.5 !py-2.5` que se usaba antes para esto.
 *
 * El ícono hereda color por `currentColor` (comportamiento por defecto de
 * lucide-react) según la clase `text-*` del botón — así el color nunca se
 * hardcodea, se resuelve por token igual que el resto del componente.
 *
 * @typedef {'md'|'lg'} IconButtonSize
 * @typedef {'ghost'|'solid'} IconButtonVariant
 */

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV

const SIZE_CLASSES = {
  md: 'w-11 h-11', // 44px — mínimo táctil, no bajar de aquí
  lg: 'w-12 h-12', // 48px
}

const ICON_PX = { md: 20, lg: 22 }

const VARIANT_CLASSES = {
  ghost: 'bg-transparent text-ink hover:bg-gray-100 active:bg-gray-200',
  solid: 'bg-surface border border-border text-ink hover:bg-gray-50',
}

/**
 * @param {{
 *   icon: import('react').ComponentType<{size?: number}>,
 *   size?: IconButtonSize, variant?: IconButtonVariant,
 *   disabled?: boolean, loading?: boolean, onClick?: () => void,
 *   'aria-label': string, className?: string,
 * } & Omit<import('react').ButtonHTMLAttributes<HTMLButtonElement>, 'children'>} props
 */
export function IconButton({
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
  ...rest
}) {
  const isDisabled = disabled || loading

  if (isDev && !ariaLabel) {
    console.error(
      '[IconButton] aria-label es obligatorio: este botón solo tiene un ícono, ' +
      'sin label un lector de pantalla no puede anunciar qué hace.'
    )
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center rounded-full transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        isDisabled ? 'opacity-60 cursor-not-allowed' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="w-4 h-4 rounded-full border-2 border-border border-t-ink animate-spin"
        />
      ) : (
        Icon && <Icon size={ICON_PX[size]} aria-hidden="true" />
      )}
    </button>
  )
}
