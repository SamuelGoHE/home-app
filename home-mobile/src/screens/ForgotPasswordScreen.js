import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle, ShieldCheck,
} from 'lucide-react-native';
import { authService } from '../services';

/* ─── Reglas de contraseña ───────────────────────────────────────── */
const PASSWORD_RULES = [
  { key: 'len',   label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'Una letra mayúscula',  test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Una letra minúscula',  test: (p) => /[a-z]/.test(p) },
  { key: 'num',   label: 'Un número',            test: (p) => /\d/.test(p) },
];

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1);            // 1: correo, 2: nueva contraseña
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');         // viene auto en dev, manual en prod
  const [autoToken, setAutoToken] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const passwordValid = PASSWORD_RULES.every(r => r.test(password));
  const matches = password.length > 0 && password === confirm;

  /* ── Paso 1: solicitar recuperación ── */
  const handleRequest = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu correo electrónico');
      return;
    }
    setLoading(true);
    try {
      const { data } = await authService.forgotPassword(email.trim());
      // En desarrollo el backend devuelve el token directamente
      if (data?.resetToken) {
        setToken(data.resetToken);
        setAutoToken(true);
      } else {
        setAutoToken(false);
      }
      setStep(2);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Paso 2: establecer nueva contraseña ── */
  const handleReset = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Ingresa el código de recuperación que recibiste.');
      return;
    }
    if (!passwordValid) {
      Alert.alert('Contraseña insegura', 'Tu contraseña debe cumplir todos los requisitos.');
      return;
    }
    if (!matches) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(token.trim(), password);
      Alert.alert(
        '¡Listo! 🎉',
        'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.',
        [{ text: 'Iniciar sesión', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo restablecer la contraseña. El código puede haber expirado.');
    } finally {
      setLoading(false);
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
              onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
              className="w-9 h-9 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100"
            >
              <ArrowLeft size={18} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Ícono + Título */}
          <View className="px-7 pb-7">
            <View className="w-14 h-14 rounded-2xl bg-red-50 items-center justify-center mb-4">
              {step === 1
                ? <KeyRound size={26} color="#E8432D" />
                : <ShieldCheck size={26} color="#E8432D" />}
            </View>
            <Text className="text-[28px] font-extrabold text-[#111] leading-tight">
              {step === 1 ? 'Recuperar' : 'Nueva'}{'\n'}
              <Text className="text-[#E8432D]">{step === 1 ? 'contraseña' : 'contraseña'}</Text>
            </Text>
            <Text className="text-[14px] text-gray-500 mt-1.5">
              {step === 1
                ? 'Ingresa el correo de tu cuenta y te ayudaremos a restablecerla.'
                : 'Crea una contraseña nueva y segura para tu cuenta.'}
            </Text>
          </View>

          <View className="px-7 flex-1">
            {step === 1 ? (
              <>
                {/* Email */}
                <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-6 ${focused === 'email' ? 'border-[#E8432D]' : 'border-gray-100'}`}>
                  <Mail size={17} color="#9ca3af" />
                  <TextInput
                    placeholder="Correo electrónico"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 text-[15px] font-medium text-[#111]"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleRequest}
                  disabled={loading}
                  className="w-full py-4 bg-[#E8432D] rounded-full flex-row justify-center items-center shadow-md shadow-[#E8432D]/30"
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text className="text-white font-bold text-[16px]">Continuar</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Banner según modo */}
                {autoToken ? (
                  <View className="flex-row items-center gap-2 bg-green-50 border border-green-100 rounded-2xl px-4 py-3 mb-5">
                    <CheckCircle size={18} color="#16a34a" />
                    <Text className="flex-1 text-[12px] font-medium text-green-700">
                      Verificamos tu cuenta. Crea tu nueva contraseña.
                    </Text>
                  </View>
                ) : (
                  <View className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5">
                    <Text className="text-[12px] font-medium text-amber-700">
                      Te enviamos un código de recuperación a <Text className="font-bold">{email}</Text>. Ingrésalo abajo junto con tu nueva contraseña.
                    </Text>
                  </View>
                )}

                {/* Campo de código (solo si no vino automático) */}
                {!autoToken && (
                  <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-4 ${focused === 'token' ? 'border-[#E8432D]' : 'border-gray-100'}`}>
                    <KeyRound size={17} color="#9ca3af" />
                    <TextInput
                      placeholder="Código de recuperación"
                      value={token}
                      onChangeText={setToken}
                      onFocus={() => setFocused('token')}
                      onBlur={() => setFocused(null)}
                      autoCapitalize="none"
                      className="flex-1 text-[15px] font-medium text-[#111]"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                )}

                {/* Nueva contraseña */}
                <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-3 ${focused === 'pw' ? 'border-[#E8432D]' : 'border-gray-100'}`}>
                  <Lock size={17} color="#9ca3af" />
                  <TextInput
                    placeholder="Nueva contraseña"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused('pw')}
                    onBlur={() => setFocused(null)}
                    secureTextEntry={!showPw}
                    className="flex-1 text-[15px] font-medium text-[#111]"
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
                  </TouchableOpacity>
                </View>

                {/* Confirmar contraseña */}
                <View className={`flex-row items-center gap-3 border-2 rounded-2xl px-4 py-3.5 mb-4 ${focused === 'confirm' ? 'border-[#E8432D]' : 'border-gray-100'}`}>
                  <Lock size={17} color="#9ca3af" />
                  <TextInput
                    placeholder="Confirmar contraseña"
                    value={confirm}
                    onChangeText={setConfirm}
                    onFocus={() => setFocused('confirm')}
                    onBlur={() => setFocused(null)}
                    secureTextEntry={!showPw}
                    className="flex-1 text-[15px] font-medium text-[#111]"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Checklist de requisitos */}
                <View className="bg-gray-50 rounded-2xl px-4 py-3 mb-3 gap-1.5">
                  {PASSWORD_RULES.map(r => {
                    const ok = r.test(password);
                    return (
                      <View key={r.key} className="flex-row items-center gap-2">
                        <View
                          className="w-4 h-4 rounded-full items-center justify-center"
                          style={{ backgroundColor: ok ? '#16a34a' : '#e5e7eb' }}
                        >
                          {ok && <CheckCircle size={11} color="#fff" />}
                        </View>
                        <Text className={`text-[12px] font-medium ${ok ? 'text-green-700' : 'text-gray-400'}`}>
                          {r.label}
                        </Text>
                      </View>
                    );
                  })}
                  {confirm.length > 0 && (
                    <View className="flex-row items-center gap-2">
                      <View
                        className="w-4 h-4 rounded-full items-center justify-center"
                        style={{ backgroundColor: matches ? '#16a34a' : '#e5e7eb' }}
                      >
                        {matches && <CheckCircle size={11} color="#fff" />}
                      </View>
                      <Text className={`text-[12px] font-medium ${matches ? 'text-green-700' : 'text-gray-400'}`}>
                        Las contraseñas coinciden
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={loading || !passwordValid || !matches}
                  className="w-full py-4 rounded-full flex-row justify-center items-center"
                  style={{ backgroundColor: (!passwordValid || !matches) ? '#e5e7eb' : '#E8432D' }}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text className={`font-bold text-[16px] ${(!passwordValid || !matches) ? 'text-gray-400' : 'text-white'}`}>
                        Restablecer contraseña
                      </Text>}
                </TouchableOpacity>
              </>
            )}

            {/* Volver a login */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-[14px] text-gray-500">¿Ya la recordaste? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text className="text-[#E8432D] font-bold text-[14px]">Inicia sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
