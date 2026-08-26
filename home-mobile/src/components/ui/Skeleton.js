import { View } from 'react-native'

/**
 * Skeleton — primitivo genérico del design system HOME (mobile).
 *
 * Reemplaza las dos implementaciones no relacionadas que ya existen
 * (`CardSkeleton` en Projectsscreen.js y `SkeletonCard` en Myratingscreen.js)
 * — ninguna de las dos se toca en esta fase, pero cualquier skeleton nuevo
 * debería construirse sobre este primitivo.
 *
 * Nota: sin `react-native-reanimated` en uso (confirmado: la dependencia
 * está instalada pero no se usa en ninguna pantalla), la animación de pulso
 * se resuelve con la utilidad `animate-pulse` de NativeWind, no con
 * Reanimated — mantiene esta pieza sin dependencias nuevas.
 *
 * @typedef {'block'|'circle'|'text'} SkeletonVariant
 */

const VARIANT_CLASSES = {
  block: 'rounded-2xl',
  circle: 'rounded-full',
  text: 'rounded h-3',
}

/**
 * @param {{ variant?: SkeletonVariant, width?: number|string, height?: number|string, className?: string }} props
 */
export function Skeleton({ variant = 'block', width, height, className = '' }) {
  return (
    <View
      className={['animate-pulse bg-gray-200', VARIANT_CLASSES[variant], className].filter(Boolean).join(' ')}
      style={{ width, height }}
    />
  )
}
