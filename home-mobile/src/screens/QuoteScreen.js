import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Ruler, Home, FileText, Info, X, ChevronDown } from 'lucide-react-native';

export default function QuoteScreen({ route, navigation }) {
  const serviceId = route.params?.serviceId;
  const serviceName = route.params?.serviceName || 'Servicio General';
  const serviceCategory = route.params?.serviceCategory || '';

  const [form, setForm] = useState({ city: '', address: '', sq_meters: '', occupied: '', notes: '' });
  const [showCityModal, setShowCityModal] = useState(false);
  const [showOccupiedModal, setShowOccupiedModal] = useState(false);

  const set = (field) => (val) => setForm(prev => ({ ...prev, [field]: val }));
  
  const hasMeters = !form.sq_meters || Number(form.sq_meters) > 0;
  const isValid = form.city.trim() && form.address.trim() && form.occupied && hasMeters;

  const handleSubmit = () => {
    if (!serviceId) {
      navigation.navigate('ServicesTab', { screen: 'ServicesTabScreen' });
      return;
    }

    navigation.navigate('Results', {
      serviceId,
      serviceName,
      serviceCategory,
      ...form,
      occupied: form.occupied === 'ocupada',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9fb]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="bg-white border-b border-gray-100 z-20">
          <View className="flex-row items-center gap-3 px-5 pt-4 pb-4">
            <TouchableOpacity onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center rounded-xl bg-gray-100">
              <ArrowLeft size={18} color="#4b5563" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-[18px] font-extrabold text-[#111] leading-tight">Cotizar</Text>
              <Text className="text-[12px] text-gray-400 font-medium">{serviceName}</Text>
            </View>
            <View className="w-9 h-9 items-center justify-center rounded-xl bg-red-50">
              <Info size={18} color="#E8432D" />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Card Informativa */}
          <View className="bg-[#E8432D] rounded-3xl p-5 flex-row gap-4 mb-5">
            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
              <Info size={20} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[15px] text-white">Detalles del espacio</Text>
              <Text className="text-[13px] text-white/80 mt-0.5 leading-relaxed">
                Completa estos datos para que los profesionales puedan darte un presupuesto exacto.
              </Text>
            </View>
          </View>

          {/* Formulario */}
          <View className="bg-white rounded-3xl p-1 shadow-sm border border-gray-100 mb-5">
            {/* Ciudad */}
            <View className="p-4 border-b border-gray-50 flex-row items-center gap-3">
              <MapPin size={18} color="#E8432D" />
              <View className="flex-1 relative">
                <Text className="text-[10px] font-bold text-[#E8432D] uppercase tracking-wide mb-0.5">Ciudad *</Text>
                <TouchableOpacity onPress={() => setShowCityModal(true)} className="flex-row items-center justify-between py-1">
                  <Text className={`text-[15px] font-semibold ${form.city ? 'text-[#111]' : 'text-gray-300'}`}>
                    {form.city || 'Ej: Bogotá, Medellín...'}
                  </Text>
                  <ChevronDown size={16} color="#E8432D" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Dirección */}
            <View className="p-4 border-b border-gray-50 flex-row items-center gap-3">
              <View className="w-[18px]" />
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-[#E8432D] uppercase tracking-wide mb-0.5">Dirección *</Text>
                <TextInput
                  placeholder="Dirección completa del proyecto"
                  value={form.address}
                  onChangeText={set('address')}
                  className="text-[15px] font-semibold text-[#111] py-1"
                  placeholderTextColor="#d1d5db"
                />
              </View>
            </View>

            <View className="flex-row">
              {/* Área */}
              <View className="flex-1 p-4 border-r border-gray-50 flex-row items-center gap-3">
                <Ruler size={18} color="#E8432D" />
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-[#E8432D] uppercase tracking-wide mb-0.5">Área (m²)</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Ej: 45"
                    value={form.sq_meters}
                    onChangeText={set('sq_meters')}
                    className="text-[15px] font-semibold text-[#111] py-1"
                    placeholderTextColor="#d1d5db"
                  />
                </View>
              </View>
              {/* Estado */}
              <View className="flex-1 p-4 flex-row items-center gap-3">
                <Home size={18} color="#E8432D" />
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-[#E8432D] uppercase tracking-wide mb-0.5">Estado *</Text>
                  <TouchableOpacity onPress={() => setShowOccupiedModal(true)} className="flex-row items-center justify-between py-1">
                    <Text className={`text-[15px] font-semibold ${form.occupied ? 'text-[#111]' : 'text-gray-300'}`}>
                      {form.occupied === 'ocupada' ? 'Ocupada' : form.occupied === 'desocupada' ? 'Desocupada' : 'Seleccionar'}
                    </Text>
                    <ChevronDown size={14} color="#E8432D" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Notas */}
          <View className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex-row items-start gap-3">
            <FileText size={18} color="#E8432D" className="mt-1" />
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-[#E8432D] uppercase tracking-wide mb-1">Notas adicionales</Text>
              <TextInput
                value={form.notes}
                onChangeText={set('notes')}
                placeholder="Describe detalles específicos..."
                multiline
                numberOfLines={3}
                className="text-[14px] text-[#111] py-1"
                placeholderTextColor="#d1d5db"
                style={{ minHeight: 60, textAlignVertical: 'top' }}
              />
            </View>
          </View>
        </ScrollView>

        {/* Bottom Bar */}
        <View className="bg-white border-t border-gray-100 p-5 pb-8 z-30">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isValid}
            className="w-full py-4 rounded-full items-center justify-center"
            style={{
              backgroundColor: isValid ? '#E8432D' : '#e5e7eb',
              shadowColor: isValid ? '#E8432D' : 'transparent',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text className={`text-[17px] font-bold ${isValid ? 'text-white' : 'text-gray-400'}`}>
              Buscar profesionales
            </Text>
          </TouchableOpacity>
        </View>

        {/* City Modal */}
        <Modal visible={showCityModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <TouchableOpacity className="flex-1" onPress={() => setShowCityModal(false)} />
            <View className="bg-white rounded-t-3xl p-6 pb-10">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-[18px] font-extrabold text-[#111]">Ciudad del servicio</Text>
                <TouchableOpacity onPress={() => setShowCityModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <X size={16} color="#4b5563" />
                </TouchableOpacity>
              </View>
              {['Medellín', 'Bogotá', 'Cali', 'Pereira'].map(city => (
                <TouchableOpacity key={city} onPress={() => { set('city')(city); setShowCityModal(false); }} className="py-4 border-b border-gray-100">
                  <Text className={`text-[16px] font-bold ${form.city === city ? 'text-[#E8432D]' : 'text-[#111]'}`}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Occupied Modal */}
        <Modal visible={showOccupiedModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <TouchableOpacity className="flex-1" onPress={() => setShowOccupiedModal(false)} />
            <View className="bg-white rounded-t-3xl p-6 pb-10">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-[18px] font-extrabold text-[#111]">Estado del inmueble</Text>
                <TouchableOpacity onPress={() => setShowOccupiedModal(false)} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
                  <X size={16} color="#4b5563" />
                </TouchableOpacity>
              </View>
              {[{ v: 'ocupada', l: 'Ocupada' }, { v: 'desocupada', l: 'Desocupada' }].map(opt => (
                <TouchableOpacity key={opt.v} onPress={() => { set('occupied')(opt.v); setShowOccupiedModal(false); }} className="py-4 border-b border-gray-100">
                  <Text className={`text-[16px] font-bold ${form.occupied === opt.v ? 'text-[#E8432D]' : 'text-[#111]'}`}>{opt.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
