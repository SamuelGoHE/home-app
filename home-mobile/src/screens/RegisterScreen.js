import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone, Briefcase, Home } from 'lucide-react-native';

const CITIES = ['Medellín', 'Bogotá', 'Cali', 'Pereira'];
import { useAuthStore } from '../context/authStore';
import PasswordChecklist, { isPasswordValid } from '../components/PasswordChecklist';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'cliente', city: '' });
  const [showPw, setShowPw] = useState(false);
  const { register, isLoading } = useAuthStore();

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const setRole = (role) => setForm(f => ({ ...f, role, city: '' }));

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) {
      Alert.alert('Error', 'Completa los campos obligatorios');
      return;
    }
    if (!isPasswordValid(form.password)) {
      Alert.alert('Contraseña insegura', 'Tu contraseña debe cumplir todos los requisitos: mínimo 8 caracteres, una mayúscula, una minúscula y un número.');
      return;
    }
    if (form.role === 'trabajador' && !form.city) {
      Alert.alert('Error', 'Selecciona tu ciudad de trabajo');
      return;
    }
    const payload = { ...form };
    if (!payload.phone) delete payload.phone;
    const result = await register(payload);
    if (!result.success) {
      Alert.alert('Error', result.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="px-6 pt-4 pb-4 flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100">
              <ArrowLeft size={18} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Título */}
          <View className="px-7 pb-6">
            <Text className="text-[28px] font-extrabold text-[#111] leading-tight">
              Crea tu cuenta{'\n'}
              <Text className="text-[#E8432D]">es gratis</Text>
            </Text>
            <Text className="text-[14px] text-gray-500 mt-1.5">Solo te tomará un minuto</Text>
          </View>

          <View className="px-7 flex-1">
            {/* Nombre */}
            <View className="flex-row items-center gap-3 border-2 border-gray-100 rounded-2xl px-4 py-3.5 mb-4">
              <User size={17} color="#9ca3af" />
              <TextInput placeholder="Nombre completo" value={form.name} onChangeText={set('name')} className="flex-1 text-[15px] font-medium text-[#111]" placeholderTextColor="#9ca3af" />
            </View>

            {/* Email */}
            <View className="flex-row items-center gap-3 border-2 border-gray-100 rounded-2xl px-4 py-3.5 mb-4">
              <Mail size={17} color="#9ca3af" />
              <TextInput placeholder="Correo electrónico" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" className="flex-1 text-[15px] font-medium text-[#111]" placeholderTextColor="#9ca3af" />
            </View>

            {/* Password */}
            <View className="flex-row items-center gap-3 border-2 border-gray-100 rounded-2xl px-4 py-3.5 mb-2">
              <Lock size={17} color="#9ca3af" />
              <TextInput placeholder="Contraseña" value={form.password} onChangeText={set('password')} secureTextEntry={!showPw} className="flex-1 text-[15px] font-medium text-[#111]" placeholderTextColor="#9ca3af" />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={17} color="#9ca3af" /> : <Eye size={17} color="#9ca3af" />}
              </TouchableOpacity>
            </View>

            {/* Requisitos en vivo mientras crea la contraseña */}
            {form.password.length > 0 && (
              <View className="mb-2">
                <PasswordChecklist password={form.password} />
              </View>
            )}
            <View className="mb-2" />

            {/* Teléfono */}
            <View className="flex-row items-center gap-3 border-2 border-gray-100 rounded-2xl px-4 py-3.5 mb-6">
              <Phone size={17} color="#9ca3af" />
              <TextInput placeholder="Teléfono (opcional)" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" className="flex-1 text-[15px] font-medium text-[#111]" placeholderTextColor="#9ca3af" />
            </View>

            {/* Roles */}
            <Text className="text-[13px] font-semibold text-gray-500 mb-2.5 ml-1">¿Cómo vas a usar HOME?</Text>
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => setRole('cliente')}
                activeOpacity={0.85}
                className={`flex-1 p-3.5 rounded-2xl border-2 ${form.role === 'cliente' ? 'border-[#E8432D] bg-[#E8432D]' : 'border-gray-100 bg-white'}`}
              >
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Home size={16} color={form.role === 'cliente' ? '#fff' : '#4b5563'} />
                  <Text className={`text-[13px] font-bold ${form.role === 'cliente' ? 'text-white' : 'text-gray-600'}`}>Cliente</Text>
                </View>
                <Text style={{ color: form.role === 'cliente' ? 'rgba(255,255,255,0.75)' : '#9ca3af' }} className="text-[11px]">
                  Busco trabajadores
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setRole('trabajador')}
                activeOpacity={0.85}
                className={`flex-1 p-3.5 rounded-2xl border-2 ${form.role === 'trabajador' ? 'border-[#E8432D] bg-[#E8432D]' : 'border-gray-100 bg-white'}`}
              >
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Briefcase size={16} color={form.role === 'trabajador' ? '#fff' : '#4b5563'} />
                  <Text className={`text-[13px] font-bold ${form.role === 'trabajador' ? 'text-white' : 'text-gray-600'}`}>Profesional</Text>
                </View>
                <Text style={{ color: form.role === 'trabajador' ? 'rgba(255,255,255,0.75)' : '#9ca3af' }} className="text-[11px]">
                  Ofrezco mis servicios
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ciudad — solo para trabajadores */}
            {form.role === 'trabajador' && (
              <View className="mb-6">
                <Text className="text-[13px] font-semibold text-gray-500 mb-2.5 ml-1">¿En qué ciudad trabajas?</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CITIES.map((city) => (
                    <TouchableOpacity
                      key={city}
                      onPress={() => set('city')(city)}
                      activeOpacity={0.8}
                      className={`px-5 py-2.5 rounded-xl border-2 ${
                        form.city === city
                          ? 'bg-[#E8432D] border-[#E8432D]'
                          : 'bg-white border-gray-100'
                      }`}
                    >
                      <Text className={`text-[13px] font-semibold ${form.city === city ? 'text-white' : 'text-gray-600'}`}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity onPress={handleSubmit} disabled={isLoading} className="w-full py-4 bg-[#E8432D] rounded-full flex-row justify-center items-center shadow-md shadow-[#E8432D]/30 mb-6">
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-[16px]">Crear cuenta gratis</Text>}
            </TouchableOpacity>

            <View className="flex-row justify-center mb-4">
              <Text className="text-[14px] text-gray-500">¿Ya tienes cuenta? </Text>
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
