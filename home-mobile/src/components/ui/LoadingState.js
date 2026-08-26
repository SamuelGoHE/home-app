import { View, Text, ActivityIndicator } from 'react-native'

/**
 * LoadingState — consolida el patrón "ActivityIndicator + texto opcional"
 * que hoy cada pantalla repite con su propio color/tamaño (la mayoría ya usa
 * `color="#E8432D"` consistentemente, salvo GoogleSignInButton/SocialButton
 * que usan gris — ver Radiografía HOME). Se usa el componente nativo
 * `ActivityIndicator` en vez de una animación CSS, evitando cualquier duda
 * sobre soporte de `animate-*` de NativeWind en un componente que se usará
 * mucho. Ninguna pantalla lo consume todavía.
 *
 * @param {{ message?: string, fullScreen?: boolean, className?: string }} props
 */
export function LoadingState({ message, fullScreen = false, className = '' }) {
  return (
    <View
      accessibilityRole="progressbar"
      className={['items-center justify-center gap-3 py-12', fullScreen ? 'flex-1' : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <ActivityIndicator size="large" color="#E8432D" />
      {message && <Text className="text-caption text-muted">{message}</Text>}
    </View>
  )
}
