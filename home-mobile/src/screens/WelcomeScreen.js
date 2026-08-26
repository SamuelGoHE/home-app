import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail } from 'lucide-react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAppleAuth } from '../hooks/useAppleAuth';
import { Button } from '../components/ui';

/**
 * Colores literales necesarios para props que no aceptan clases de Tailwind
 * (StatusBar, íconos lucide-react-native).
 */
const ICON = {
  brand: '#E8432D',   // = tokens.colors.brand.DEFAULT
  surface: '#ffffff', // = tokens.colors.surface.DEFAULT
  ink: '#111111',     // = tokens.colors.ink — react-native-svg no soporta className, requiere fill literal
};

/* ─── Logos ──────────────────────────────────────────────────────── */

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
  );
}

function FacebookLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </Svg>
  );
}

function AppleLogo() {
  return (
    <Svg width={27} height={24} viewBox="0 0 24 24">
      <G transform="translate(0.4 0.2) scale(1.08)">
        <Path
          fill={ICON.ink}
          d="M19.665 16.811a10.316 10.316 0 0 1-1.021 3.753c-.537 1.145-1.394 2.418-2.572 2.483-1.073.058-1.563-.601-3.074-.601-1.51 0-2.001.58-3.065.6-1.203.023-2.08-1.25-2.617-2.395C5.81 17.851 5.09 14.247 5.9 11.2a5.7 5.7 0 0 1 1.879-3.079 5.04 5.04 0 0 1 2.85-1.012c1.17 0 2.145.714 3.077.714.933 0 2.208-.863 3.616-.722a5.07 5.07 0 0 1 2.917 1.293c-2.533 1.52-2.591 4.797-.574 6.417zM16.028 5.7a4.884 4.884 0 0 1-3.428 1.602 4.3 4.3 0 0 1 1.159-3.194 5.17 5.17 0 0 1 3.307-1.617 4.61 4.61 0 0 1-1.038 3.21z"
        />
      </G>
    </Svg>
  );
}

/* ─── Botón social reutilizable ──────────────────────────────────── */

function SocialButton({ icon, label, onPress, disabled, loading }) {
  return (
    <Button
      variant="secondary"
      fullWidth
      loading={loading}
      disabled={disabled}
      accessibilityLabel={label}
      onPress={onPress}
    >
      <View className="flex-row items-center gap-4">
        <View className="w-5 items-center justify-center">{icon}</View>
        <Text className="font-semibold text-[15px] text-ink">{label}</Text>
      </View>
    </Button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WELCOME / AUTH SCREEN
══════════════════════════════════════════════════════════════════ */
export default function WelcomeScreen({ navigation }) {
  const { signInWithGoogle, googleReady, googleLoading } = useGoogleAuth();
  const { signInWithApple, appleReady, appleLoading } = useAppleAuth();

  const comingSoon = (provider) =>
    Alert.alert('Próximamente', `El inicio de sesión con ${provider} estará disponible pronto.`);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={ICON.surface} />
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Logo ── */}
          <View className="items-center mb-10">
            <View className="flex-row items-center gap-3">
              <Text className="text-[28px] font-extrabold text-ink tracking-tight">HOME</Text>
            </View>
          </View>

          {/* ── Título ── */}
          <View className="items-center mb-10">
            <Text className="text-[26px] font-extrabold text-ink text-center leading-tight">
              Gestiona tu hogar{'\n'}
              <Text className="text-brand">como un profesional</Text>
            </Text>
            <Text className="text-[14px] text-gray-400 text-center mt-3 leading-relaxed">
              Cotizaciones, proyectos y trabajadores del hogar{'\n'}
              en un solo lugar. Crea tu cuenta gratis en segundos.
            </Text>
          </View>

          {/* ── Opciones sociales ── */}
          <View className="gap-3">
            <SocialButton
              icon={<GoogleLogo />}
              label="Continuar con Google"
              onPress={signInWithGoogle}
              loading={googleLoading}
            />
            <SocialButton
              icon={<FacebookLogo />}
              label="Continuar con Facebook"
              onPress={() => comingSoon('Facebook')}
            />
            {appleReady && (
              <SocialButton
                icon={<AppleLogo />}
                label="Continuar con Apple"
                onPress={signInWithApple}
                loading={appleLoading}
              />
            )}
          </View>

          {/* ── Divisor ── */}
          <View className="flex-row items-center gap-3 my-5">
            <View className="flex-1 h-px bg-gray-100" />
            <View className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            <View className="flex-1 h-px bg-gray-100" />
          </View>

          {/* ── Correo ── */}
          <SocialButton
            icon={<Mail size={20} color={ICON.brand} strokeWidth={2} />}
            label="Continuar con correo"
            onPress={() => navigation.navigate('Register')}
          />

          {/* ── Explorar sin cuenta ── */}
          <TouchableOpacity
            className="mt-6 items-center py-2"
            activeOpacity={0.6}
            onPress={() => comingSoon('modo invitado')}
          >
            <Text className="text-[14px] text-gray-400 font-medium">Explorar sin cuenta →</Text>
          </TouchableOpacity>

          {/* ── Footer ── */}
          <View className="mt-auto pt-8 items-center gap-3">
            <View className="flex-row items-center">
              <Text className="text-[14px] text-gray-500">¿Ya tienes cuenta? </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
                <Text className="text-[14px] text-brand font-bold">Inicia sesión</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-[11px] text-gray-400 text-center leading-relaxed">
              Al continuar aceptas nuestros{' '}
              <Text className="underline text-gray-500">Términos de uso</Text>
              {' '}y{' '}
              <Text className="underline text-gray-500">Política de privacidad</Text>
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
