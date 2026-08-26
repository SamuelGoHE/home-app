import { Text, Pressable, ActivityIndicator } from 'react-native'

/**
 * Button — primitivo del design system HOME (mobile).
 *
 * home-mobile no tenía ningún botón compartido (cada screen reimplementaba
 * el suyo con TouchableOpacity + estilos propios). Ninguna pantalla lo
 * consume todavía. Incluye accessibilityRole/hitSlop por defecto para nacer
 * accesible desde el día 1 — la auditoría encontró 0 accessibilityLabel/Role
 * en las 23 pantallas existentes, pero esta fase no las toca.
 *
 * @typedef {'primary'|'secondary'|'ghost'} ButtonVariant
 * @typedef {'sm'|'md'} ButtonSize
 */

const VARIANT_CLASSES = {
  primary: 'bg-brand active:bg-brand-dark',
  secondary: 'bg-white border border-border active:bg-gray-50',
  ghost: 'bg-transparent active:bg-brand-soft',
}

const TEXT_CLASSES = {
  primary: 'text-white',
  secondary: 'text-text',
  ghost: 'text-brand',
}

const SIZE_CLASSES = {
  sm: 'px-4 py-2.5',
  md: 'px-6 py-3.5',
}

const TEXT_SIZE_CLASSES = {
  sm: 'text-caption',
  md: 'text-body',
}

const isDev = typeof __DEV__ !== 'undefined' && __DEV__

/**
 * @param {{
 *   variant?: ButtonVariant, size?: ButtonSize, loading?: boolean,
 *   disabled?: boolean, fullWidth?: boolean, onPress?: () => void,
 *   children: import('react').ReactNode, accessibilityLabel?: string,
 *   accessibilityHint?: string, className?: string,
 * }} props
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  className = '',
  ...rest
}) {
  const isDisabled = disabled || loading
  const isTextChild = typeof children === 'string'

  if (isDev && !isTextChild && !accessibilityLabel) {
    console.error(
      '[Button] Falta accessibilityLabel: este botón no tiene texto (children no es un string), ' +
      'así que un lector de pantalla no puede anunciarlo. Pasa accessibilityLabel explícito.'
    )
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (isTextChild ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      className={[
        'flex-row items-center justify-center gap-2 rounded-full active:opacity-80',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-60' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : '#E8432D'}
        />
      )}
      {typeof children === 'string' ? (
        <Text className={`font-bold ${TEXT_SIZE_CLASSES[size]} ${TEXT_CLASSES[variant]}`}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
