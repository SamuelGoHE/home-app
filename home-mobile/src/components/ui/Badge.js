import { View, Text } from 'react-native'

/**
 * Badge — primitivo de tono semántico del design system HOME (mobile).
 * Espejo de home-frontend/src/components/ui/Badge.jsx — mismas 6 claves de
 * tono, mismos pares bg/text de la paleta de Tailwind, para que un mismo
 * `tone` se vea igual en ambas plataformas.
 *
 * @typedef {'neutral'|'info'|'warning'|'caution'|'success'|'error'} BadgeTone
 */

const TONE_CLASSES = {
  neutral: 'bg-gray-100',
  info: 'bg-blue-100',
  warning: 'bg-orange-100',
  caution: 'bg-yellow-100',
  success: 'bg-green-100',
  error: 'bg-red-100',
}

const TONE_TEXT_CLASSES = {
  neutral: 'text-gray-600',
  info: 'text-blue-700',
  warning: 'text-orange-700',
  caution: 'text-yellow-700',
  success: 'text-green-700',
  error: 'text-red-600',
}

/** @param {{ tone?: BadgeTone, children: string, className?: string }} props */
export function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <View className={['self-start px-2.5 py-1 rounded-full', TONE_CLASSES[tone], className].filter(Boolean).join(' ')}>
      <Text className={`text-[11px] font-semibold ${TONE_TEXT_CLASSES[tone]}`}>{children}</Text>
    </View>
  )
}
