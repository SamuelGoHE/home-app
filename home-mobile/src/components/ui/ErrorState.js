import { View, Text } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'
import { Button } from './Button.js'

/**
 * ErrorState — home-mobile no tenía ninguna versión centralizada. La
 * auditoría encontró que solo 2 de ~10 pantallas con fetch distinguían un
 * error de red de "no hay datos" (Projectsscreen, Projectdetailscreen); el
 * resto caía silenciosamente en su empty state. Este componente es la base
 * para cerrar esa brecha en la fase de migración — no se conecta a ninguna
 * pantalla todavía.
 *
 * @param {{ message?: string, onRetry?: () => void }} props
 */
export function ErrorState({ message, onRetry }) {
  return (
    <View className="bg-surface-soft border border-border rounded-card items-center justify-center py-12 px-8">
      <View className="w-11 h-11 rounded-2xl bg-white border border-red-100 items-center justify-center mb-3">
        <AlertTriangle size={20} color="#dc2626" />
      </View>
      <Text className="text-caption text-gray-600 mb-4 text-center">{message || 'Algo salió mal'}</Text>
      {onRetry && (
        <Button variant="secondary" size="sm" onPress={onRetry}>
          Reintentar
        </Button>
      )}
    </View>
  )
}
