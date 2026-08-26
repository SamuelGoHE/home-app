import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PasswordChecklist, { isPasswordValid } from '../components/PasswordChecklist';
import { Button, IconButton, BackButton } from '../components/ui';

/**
 * Color literal necesario para la prop `color` de los íconos
 * lucide-react-native dentro del campo (no aceptan className). Coincide con
 * el mismo valor que ya usa `placeholderTextColor` en components/ui/Input.js.
 */
const ICON = { muted: '#9ca3af' };

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login, isLoading } = useAuthStore();
  const { signInWithGoogle, googleReady, googleLoading } = useGoogleAuth();

  // Checklist visible mientras escribe y la contraseña aún no cumple los requisitos
  const showChecklist = password.length > 0 && !isPasswordValid(password);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa tu correo y contraseña');
      return;
    }
    const result = await login(email, password);
    if (!result.success) {
      // Si la contraseña no cumple los requisitos mínimos del sistema,
      // seguro hay un error de escritura — se lo decimos claro.
      if (!isPasswordValid(password)) {
        Alert.alert(
          'Revisa tu contraseña',
          'La contraseña que escribiste no cumple los requisitos mínimos, así que probablemente hay un error de escritura. Revisa las mayúsculas, minúsculas y números.'
        );
      } else {
        Alert.alert('Error', result.message);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="px-6 pt-4 pb-4 flex-row items-center">
            <BackButton onPress={() => navigation.goBack()} />
          </View>

          {/* Título */}
          <View className="px-7 pb-7">
            <Text className="text-[28px] font-extrabold text-ink leading-tight">
              Bienvenido{'\n'}
              <Text className="text-brand">de vuelta</Text>
            </Text>
            <Text className="text-[14px] text-gray-500 mt-1.5">Ingresa con tu cuenta para continuar</Text>
          </View>

          <View className="px-7 flex-1">
            {/* Email */}
            <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-4 ${focusedField === 'email' ? 'border-brand' : 'border-gray-100'
              }`}>
              <Mail size={17} color={ICON.muted} />
              <TextInput
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 text-[15px] font-medium text-ink"
                placeholderTextColor={ICON.muted}
              />
            </View>

            {/* Password */}
            <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-2 ${focusedField === 'password' ? 'border-brand' : 'border-gray-100'
              }`}>
              <Lock size={17} color={ICON.muted} />
              <TextInput
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPw}
                className="flex-1 text-[15px] font-medium text-ink"
                placeholderTextColor={ICON.muted}
              />
              <IconButton
                icon={showPw ? EyeOff : Eye}
                size="md"
                variant="ghost"
                iconColor={ICON.muted}
                accessibilityLabel={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onPress={() => setShowPw(!showPw)}
              />
            </View>

            {/* Requisitos de contraseña en vivo — ayuda a detectar errores de escritura */}
            {showChecklist && (
              <View className="mb-2">
                <PasswordChecklist
                  password={password}
                  hint="Tu contraseña debe cumplir esto — si no, revisa cómo la escribiste:"
                />
              </View>
            )}

            <TouchableOpacity className="mb-8" onPress={() => navigation.navigate('ForgotPassword')}>
              <Text className="text-right text-[13px] font-semibold text-brand">¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Submit */}
            <Button
              fullWidth
              loading={isLoading}
              className="shadow-md shadow-brand/30"
              onPress={handleSubmit}
            >
              Ingresar
            </Button>

            {/* Divisor */}
            <View className="flex-row items-center gap-3 my-5">
              <View className="flex-1 h-px bg-gray-100" />
              <Text className="text-[12px] font-medium text-gray-400">o continúa con</Text>
              <View className="flex-1 h-px bg-gray-100" />
            </View>

            <GoogleSignInButton
              onPress={signInWithGoogle}
              disabled={!googleReady || isLoading}
              loading={googleLoading}
            />

            <View className="flex-row justify-center mt-6">
              <Text className="text-[14px] text-gray-500">¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text className="text-brand font-bold text-[14px]">Regístrate gratis</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}