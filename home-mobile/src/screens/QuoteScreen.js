import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Ruler, Home, FileText, Info, X, ChevronDown } from 'lucide-react-native';
import { Button, IconButton, BackButton, Card } from '../components/ui';

/**
 * Colores literales necesarios para props `color` de lucide-react-native
 * (los íconos SVG no aceptan clases de Tailwind). Cada uno coincide
 * exactamente con el token homónimo de design-system/tokens.js.
 */
const ICON = {
  brand: '#E8432D',
  surface: '#ffffff',
};

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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Header */}
        <View className="bg-surface border-b border-border z-20">
          <View className="flex-row items-center gap-3 px-5 pt-4 pb-4">
            <BackButton onPress={() => navigation.goBack()} />
            <View className="flex-1">
              <Text className="text-[18px] font-extrabold text-ink leading-tight">Cotizar</Text>
              <Text className="text-[12px] text-muted font-medium">{serviceName}</Text>
            </View>
            <View className="w-9 h-9 items-center justify-center rounded-xl bg-brand-soft">
              <Info size={18} color={ICON.brand} />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Card Informativa */}
          <Card padding="lg" className="!bg-brand !border-0 !shadow-none flex-row gap-4 mb-5">
            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
              <Info size={20} color={ICON.surface} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[15px] text-white">Detalles del espacio</Text>
              <Text className="text-[13px] text-white/80 mt-0.5 leading-relaxed">
                Completa estos datos para que los profesionales puedan darte un presupuesto exacto.
              </Text>
            </View>
          </Card>

          {/* Formulario */}
          <Card padding="none" className="mb-5">
            {/* Ciudad */}
            <View className="p-4 border-b border-gray-50 flex-row items-center gap-3">
              <MapPin size={18} color={ICON.brand} />
              <View className="flex-1 relative">
                <Text className="text-[10px] font-bold text-brand uppercase tracking-wide mb-0.5">Ciudad *</Text>
                <TouchableOpacity
                  onPress={() => setShowCityModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Seleccionar ciudad del servicio"
                  className="flex-row items-center justify-between py-1"
                >
                  <Text className={`text-[15px] font-semibold ${form.city ? 'text-ink' : 'text-gray-300'}`}>
                    {form.city || 'Ej: Bogotá, Medellín...'}
                  </Text>
                  <ChevronDown size={16} color={ICON.brand} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Dirección */}
            <View className="p-4 border-b border-gray-50 flex-row items-center gap-3">
              <View className="w-[18px]" />
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-brand uppercase tracking-wide mb-0.5">Dirección *</Text>
                <TextInput
                  placeholder="Dirección completa del proyecto"
                  value={form.address}
                  onChangeText={set('address')}
                  className="text-[15px] font-semibold text-ink py-1"
                  placeholderTextColor="#d1d5db"
                />
              </View>
            </View>

            <View className="flex-row">
              {/* Área */}
              <View className="flex-1 p-4 border-r border-gray-50 flex-row items-center gap-3">
                <Ruler size={18} color={ICON.brand} />
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-brand uppercase tracking-wide mb-0.5">Área (m²)</Text>
                  <TextInput
                    keyboardType="numeric"
                    placeholder="Ej: 45"
                    value={form.sq_meters}
                    onChangeText={set('sq_meters')}
                    className="text-[15px] font-semibold text-ink py-1"
                    placeholderTextColor="#d1d5db"
                  />
                </View>
              </View>
              {/* Estado */}
              <View className="flex-1 p-4 flex-row items-center gap-3">
                <Home size={18} color={ICON.brand} />
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-brand uppercase tracking-wide mb-0.5">Estado *</Text>
                  <TouchableOpacity
                    onPress={() => setShowOccupiedModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Seleccionar estado del inmueble"
                    className="flex-row items-center justify-between py-1"
                  >
                    <Text className={`text-[15px] font-semibold ${form.occupied ? 'text-ink' : 'text-gray-300'}`}>
                      {form.occupied === 'ocupada' ? 'Ocupada' : form.occupied === 'desocupada' ? 'Desocupada' : 'Seleccionar'}
                    </Text>
                    <ChevronDown size={14} color={ICON.brand} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Card>

          {/* Notas */}
          <Card padding="md" className="flex-row items-start gap-3">
            <FileText size={18} color={ICON.brand} className="mt-1" />
            <View className="flex-1">
              <Text className="text-[10px] font-bold text-brand uppercase tracking-wide mb-1">Notas adicionales</Text>
              <TextInput
                value={form.notes}
                onChangeText={set('notes')}
                placeholder="Describe detalles específicos..."
                multiline
                numberOfLines={3}
                className="text-[14px] text-ink py-1"
                placeholderTextColor="#d1d5db"
                style={{ minHeight: 60, textAlignVertical: 'top' }}
              />
            </View>
          </Card>
        </ScrollView>

        {/* Bottom Bar */}
        <View className="bg-surface border-t border-border p-5 pb-8 z-30">
          <Button
            variant="primary"
            fullWidth
            disabled={!isValid}
            onPress={handleSubmit}
          >
            Buscar profesionales
          </Button>
        </View>

        {/* City Modal */}
        <Modal visible={showCityModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <TouchableOpacity className="flex-1" onPress={() => setShowCityModal(false)} accessibilityLabel="Cerrar" accessibilityRole="button" />
            <View className="bg-surface rounded-t-3xl p-6 pb-10">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-[18px] font-extrabold text-ink">Ciudad del servicio</Text>
                <IconButton icon={X} variant="solid" accessibilityLabel="Cerrar" className="!bg-gray-100 !border-0" onPress={() => setShowCityModal(false)} />
              </View>
              {['Medellín', 'Bogotá', 'Cali', 'Pereira'].map(city => (
                <Button
                  key={city}
                  variant="ghost"
                  accessibilityLabel={city}
                  className="!justify-start !rounded-none !px-0 !py-4 border-b border-gray-100"
                  onPress={() => { set('city')(city); setShowCityModal(false); }}
                >
                  <Text className={`text-[16px] font-bold ${form.city === city ? 'text-brand' : 'text-ink'}`}>{city}</Text>
                </Button>
              ))}
            </View>
          </View>
        </Modal>

        {/* Occupied Modal */}
        <Modal visible={showOccupiedModal} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/40">
            <TouchableOpacity className="flex-1" onPress={() => setShowOccupiedModal(false)} accessibilityLabel="Cerrar" accessibilityRole="button" />
            <View className="bg-surface rounded-t-3xl p-6 pb-10">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-[18px] font-extrabold text-ink">Estado del inmueble</Text>
                <IconButton icon={X} variant="solid" accessibilityLabel="Cerrar" className="!bg-gray-100 !border-0" onPress={() => setShowOccupiedModal(false)} />
              </View>
              {[{ v: 'ocupada', l: 'Ocupada' }, { v: 'desocupada', l: 'Desocupada' }].map(opt => (
                <Button
                  key={opt.v}
                  variant="ghost"
                  accessibilityLabel={opt.l}
                  className="!justify-start !rounded-none !px-0 !py-4 border-b border-gray-100"
                  onPress={() => { set('occupied')(opt.v); setShowOccupiedModal(false); }}
                >
                  <Text className={`text-[16px] font-bold ${form.occupied === opt.v ? 'text-brand' : 'text-ink'}`}>{opt.l}</Text>
                </Button>
              ))}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
