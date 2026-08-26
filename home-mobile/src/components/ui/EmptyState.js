import { View, Text } from 'react-native'
import { Inbox } from 'lucide-react-native'
import { Button } from './Button.js'

/**
 * EmptyState — home-mobile no tenía ninguna versión centralizada; cada
 * pantalla (ServicesScreen, ChatsListScreen, ProjectsScreen, FavoritesScreen...)
 * reimplementaba su propio empty state, mezclando emojis e íconos lucide
 * para el mismo propósito (ver Radiografía HOME, sección 12). Espejo
 * conceptual del `EmptyState` ya corregido en home-frontend: si `icon` es un
 * string se renderiza como emoji real (no como ícono genérico). Ninguna
 * pantalla lo consume todavía.
 *
 * @param {{
 *   icon?: string | import('react').ReactNode, title: string, subtitle?: string,
 *   action?: string, onAction?: () => void,
 * }} props
 */
export function EmptyState({ icon = '📭', title, subtitle, action, onAction }) {
  return (
    <View className="bg-surface-soft border border-border rounded-card items-center justify-center py-14 px-8">
      <View className="w-11 h-11 rounded-2xl bg-white border border-border items-center justify-center mb-3">
        {typeof icon === 'string' ? (
          <Text className="text-xl leading-none">{icon}</Text>
        ) : icon != null ? (
          icon
        ) : (
          <Inbox size={20} color="#6b7280" />
        )}
      </View>
      <Text className="text-lg font-bold text-text mb-1 text-center">{title}</Text>
      {subtitle && <Text className="text-caption text-muted mb-6 text-center">{subtitle}</Text>}
      {action && (
        <Button variant="primary" size="sm" onPress={onAction}>
          {action}
        </Button>
      )}
    </View>
  )
}
