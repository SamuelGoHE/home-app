import { View, Text, TextInput } from 'react-native'

/**
 * Input — primitivo del design system HOME (mobile).
 *
 * Consolida el patrón label+input+error que hoy cada formulario (Login,
 * Register, Profileeditscreen) reimplementa con estilos propios. Ninguna
 * pantalla lo consume todavía.
 *
 * @param {{
 *   label?: string, hint?: string, error?: string, accessibilityHint?: string,
 *   className?: string,
 * } & import('react-native').TextInputProps} props
 */
export function Input({ label, hint, error, accessibilityHint, className = '', ...rest }) {
  return (
    <View className="w-full">
      {label && (
        <Text className="text-caption font-semibold text-text mb-1.5">{label}</Text>
      )}
      <TextInput
        placeholderTextColor="#9ca3af"
        // El error se agrega al label anunciado (no solo se muestra visualmente)
        // porque RN no tiene un equivalente real a aria-describedby en TextInput.
        accessibilityLabel={error ? `${label ? label + '. ' : ''}Error: ${error}` : label}
        accessibilityHint={accessibilityHint || hint}
        className={[
          'w-full border rounded-input bg-white px-4 py-3.5 text-body text-text',
          error ? 'border-error' : 'border-border',
          className,
        ].filter(Boolean).join(' ')}
        {...rest}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" className="mt-1.5 text-xs font-medium text-error">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-1.5 text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  )
}
