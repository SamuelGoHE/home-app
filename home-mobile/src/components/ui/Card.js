import { View, Pressable } from 'react-native'

/**
 * Card — primitivo del design system HOME (mobile).
 *
 * home-mobile no tenía ningún contenedor de tarjeta compartido — cada
 * pantalla repite `rounded-2xl`/`rounded-3xl`/`rounded-[28px]` con bordes y
 * sombras inconsistentes (ver Radiografía HOME, sección Espaciado). Ninguna
 * pantalla lo consume todavía.
 *
 * Sin `onPress` se comporta exactamente igual que antes (un `View` inerte).
 * Con `onPress` se vuelve interactiva: se renderiza como `Pressable` con
 * `accessibilityRole="button"` — la auditoría encontró varias "tarjetas
 * clicables" sin ninguna semántica de botón (ni en web ni en mobile).
 *
 * @typedef {'default'|'soft'} CardVariant
 * @typedef {'none'|'sm'|'md'|'lg'} CardPadding
 */

const isDev = typeof __DEV__ !== 'undefined' && __DEV__

const VARIANT_CLASSES = {
  default: 'bg-white border border-border rounded-card shadow-card',
  soft: 'bg-surface-soft border border-border rounded-card',
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

/**
 * @param {{
 *   variant?: CardVariant, padding?: CardPadding, onPress?: () => void,
 *   accessibilityLabel?: string, accessibilityHint?: string,
 *   children: import('react').ReactNode, className?: string,
 * } & import('react-native').ViewProps} props
 */
export function Card({
  variant = 'default',
  padding = 'md',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  className = '',
  children,
  ...rest
}) {
  const classes = [VARIANT_CLASSES[variant], PADDING_CLASSES[padding], className]
    .filter(Boolean)
    .join(' ')

  if (!onPress) {
    return (
      <View className={classes} {...rest}>
        {children}
      </View>
    )
  }

  if (isDev && !accessibilityLabel) {
    console.error(
      '[Card] Falta accessibilityLabel: esta card es interactiva (tiene onPress), ' +
      'un lector de pantalla necesita saber qué hace al activarla.'
    )
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className={`${classes} active:opacity-80`}
      {...rest}
    >
      {children}
    </Pressable>
  )
}
