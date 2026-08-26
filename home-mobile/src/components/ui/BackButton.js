import { ArrowLeft } from 'lucide-react-native'
import { IconButton } from './IconButton.js'

/**
 * BackButton — especialización de IconButton para el patrón "volver".
 *
 * Es el elemento icon-only más repetido de toda la app (14+ pantallas, todas
 * con el mismo botón de 36×36px sin accessibilityLabel — ver Radiografía
 * HOME). No reimplementa nada: hereda de IconButton el tamaño mínimo de
 * 44×44 y el label obligatorio. Ninguna pantalla lo consume todavía.
 *
 * @param {{
 *   onPress?: () => void, accessibilityLabel?: string, size?: 'md'|'lg',
 * }} props
 */
export function BackButton({ onPress, accessibilityLabel = 'Volver', ...rest }) {
  return (
    <IconButton
      icon={ArrowLeft}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      {...rest}
    />
  )
}
