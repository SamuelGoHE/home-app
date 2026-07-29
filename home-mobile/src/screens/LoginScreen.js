import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PasswordChecklist, { isPasswordValid } from '../components/PasswordChecklist';

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
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-9 h-9 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
              <ArrowLeft size={18} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Título */}
          <View className="px-7 pb-7">
            <Text className="text-[28px] font-extrabold text-[#111] leading-tight">
              Bienvenido{'\n'}
              <Text className="text-[#E8432D]">de vuelta</Text>
            </Text>
            <Text className="text-[14px] text-gray-500 mt-1.5">Ingresa con tu cuenta para continuar</Text>
          </View>

          <View className="px-7 flex-1">
            {/* Email */}
            <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-4 ${focusedField === 'email' ? 'border-[#E8432D]' : 'border-gray-100'
              }`}>
              <Mail size={17} color="#9ca3af" />
              <TextInput
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                className="flex-1 text-[15px] font-medium text-[#111]"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Password */}
            <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-2 ${focusedField === 'password' ? 'border-[#E8432D]' : 'border-gray-100'
              }`}>
              <Lock size={17} color="#9ca3af" />
              <TextInput
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPw}
                className="flex-1 text-[15px] font-medium text-[#111]"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
              </TouchableOpacity>
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
              <Text className="text-right text-[13px] font-semibold text-[#E8432D]">¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 bg-[#E8432D] rounded-full flex-row justify-center items-center shadow-md shadow-[#E8432D]/30">
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold text-[16px]">Ingresar</Text>
              )}
            </TouchableOpacity>

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
                <Text className="text-[#E8432D] font-bold text-[14px]">Regístrate gratis</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}