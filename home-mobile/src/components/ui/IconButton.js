import { Pressable, ActivityIndicator } from 'react-native'

/**
 * IconButton — primitivo del design system HOME (mobile).
 *
 * Base para todo botón de solo-ícono: volver, cerrar, favorito, notificación.
 * La auditoría encontró el mismo patrón roto repetido en 14+ pantallas — un
 * `TouchableOpacity` de 36×36px sin `hitSlop` ni accessibilityLabel. Este
 * componente hace ese error estructuralmente imposible:
 *   - El tamaño mínimo es 44×44 (`md`, w-11 h-11 = 2.75rem = valor nativo de
 *     la escala de Tailwind, no un token nuevo) — no existe una variante más
 *     chica que reintroduzca el bug.
 *   - `accessibilityLabel` no tiene default: si falta, se registra un error
 *     en desarrollo en vez de fallar en silencio.
 *
 * Ninguna pantalla lo consume todavía.
 *
 * @typedef {'md'|'lg'} IconButtonSize
 * @typedef {'ghost'|'solid'} IconButtonVariant
 */

const isDev = typeof __DEV__ !== 'undefined' && __DEV__

const SIZE_CLASSES = {
  md: 'w-11 h-11', // 44px — mínimo táctil, no bajar de aquí
  lg: 'w-12 h-12', // 48px
}

const ICON_PX = { md: 20, lg: 22 }

const VARIANT_CLASSES = {
  ghost: 'bg-transparent active:bg-gray-100',
  solid: 'bg-white border border-border active:bg-gray-50',
}

/**
 * @param {{
 *   icon: import('react').ComponentType<{size?: number, color?: string}>,
 *   size?: IconButtonSize, variant?: IconButtonVariant,
 *   disabled?: boolean, loading?: boolean, onPress?: () => void,
 *   accessibilityLabel: string, accessibilityHint?: string,
 *   iconColor?: string, className?: string,
 * }} props
 */
export function IconButton({
  icon: Icon,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  loading = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  iconColor = '#171717',
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading

  if (isDev && !accessibilityLabel) {
    console.error(
      '[IconButton] accessibilityLabel es obligatorio: este botón solo tiene un ícono, ' +
      'sin label un lector de pantalla no puede anunciar qué hace.'
    )
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      className={[
        'items-center justify-center rounded-full active:opacity-80',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        isDisabled ? 'opacity-60' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        Icon && <Icon size={ICON_PX[size]} color={iconColor} />
      )}
    </Pressable>
  )
}
