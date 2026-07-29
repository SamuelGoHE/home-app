import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Camera, User as UserIcon, Mail,
  Phone, MapPin, FileText, Star, Briefcase, Check, CheckCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import api from '../services/api';

/* ─── Especialidades disponibles ─────────────────────────────────── */
const SPECIALTIES = [
  { key: 'pintura',            label: 'Pintura' },
  { key: 'enchapes',           label: 'Enchapes' },
  { key: 'electricidad',       label: 'Electricidad' },
  { key: 'plomeria',           label: 'Plomería' },
  { key: 'obra_gris',          label: 'Obra gris' },
  { key: 'carpinteria',        label: 'Carpintería' },
  { key: 'impermeabilizacion', label: 'Impermeabilización' },
  { key: 'otro',               label: 'Otro' },
];

/* ─── Identidad de cada sección ──────────────────────────────────── */
const SECTION_META = {
  personal: {
    title:    'Mis datos personales',
    subtitle: 'Tu información de contacto privada',
    color:    '#6366f1',
    bg:       '#eef2ff',
    Icon:     UserIcon,
  },
  professional: {
    title:    'Mi perfil profesional',
    subtitle: 'Lo que tus clientes ven de ti',
    color:    '#8b5cf6',
    bg:       '#f5f3ff',
    Icon:     Briefcase,
  },
};

/* ─── Campo de formulario ────────────────────────────────────────── */
function Field({ icon: Icon, label, accent, disabled, children }) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2 mb-2 ml-1">
        <Icon size={14} color={accent || '#9ca3af'} />
        <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">{label}</Text>
      </View>
      {children}
      {disabled && (
        <Text className="text-[11px] text-gray-400 mt-1 ml-1 font-medium">
          No puedes cambiar este campo porque iniciaste sesión con OAuth.
        </Text>
      )}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN SCREEN
═══════════════════════════════════════════════════════════════════ */
export default function ProfileEditScreen({ navigation, route }) {
  const { user, fetchMe } = useAuthStore();
  const isOAuth   = user?.oauth_provider && user.oauth_provider !== 'local';
  const isWorker  = user?.role === 'trabajador';

  // Sección: 'personal' o 'professional'. Los clientes solo tienen 'personal'.
  const requested = route.params?.section || 'personal';
  const section   = (requested === 'professional' && isWorker) ? 'professional' : 'personal';
  const meta      = SECTION_META[section];

  /* ── Datos personales ── */
  const [formData, setFormData] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city:  user?.city  || '',
  });

  /* ── Perfil profesional (solo trabajadores) ── */
  const [workerProfile, setWorkerProfile] = useState({
    bio:              user?.workerProfile?.bio              || '',
    years_experience: String(user?.workerProfile?.years_experience ?? ''),
    specialties:      user?.workerProfile?.specialties      || [],
    cities_covered:   (user?.workerProfile?.cities_covered  || []).join(', '),
  });

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const set    = (field) => (val) => { setSaved(false); setFormData(f    => ({ ...f, [field]: val })); };
  const setWP  = (field) => (val) => { setSaved(false); setWorkerProfile(p => ({ ...p, [field]: val })); };

  const toggleSpecialty = (key) => {
    setSaved(false);
    setWorkerProfile(p => {
      const has = p.specialties.includes(key);
      return { ...p, specialties: has ? p.specialties.filter(s => s !== key) : [...p.specialties, key] };
    });
  };

  const handleSave = async () => {
    if (section === 'personal' && !formData.name.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    try {
      if (section === 'personal') {
        // Guardar datos personales
        await api.patch('/users/me', formData);
      } else {
        // Guardar perfil profesional
        const citiesArray = workerProfile.cities_covered
          .split(',')
          .map(c => c.trim())
          .filter(Boolean);

        await api.put('/users/worker-profile', {
          bio:              workerProfile.bio,
          years_experience: workerProfile.years_experience ? Number(workerProfile.years_experience) : null,
          specialties:      workerProfile.specialties,
          cities_covered:   citiesArray,
        });
      }

      await fetchMe();
      setSaving(false);
      setSaved(true);
      // Regresar tras mostrar la confirmación
      setTimeout(() => navigation.goBack(), 1300);
    } catch (err) {
      setSaving(false);
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar. Intenta de nuevo.');
    }
  };

  const initials = formData.name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  const SectionIcon = meta.Icon;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9fb]">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">

        {/* ── Header ── */}
        <View className="bg-white px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-100">
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-9 h-9 items-center justify-center rounded-xl bg-gray-100"
            >
              <ArrowLeft size={18} color="#4b5563" />
            </TouchableOpacity>
            <Text className="font-extrabold text-[17px] text-[#111] flex-1" numberOfLines={1}>
              {meta.title}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || saved}
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: saved ? '#dcfce7' : meta.bg }}
          >
            {saving
              ? <ActivityIndicator size="small" color={meta.color} />
              : saved
                ? <Text className="font-bold text-[14px]" style={{ color: '#16a34a' }}>✓ Guardado</Text>
                : <Text className="font-bold text-[14px]" style={{ color: meta.color }}>Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Banner de éxito ── */}
        {saved && (
          <View className="flex-row items-center gap-2 px-5 py-3 bg-green-50 border-b border-green-100">
            <CheckCircle size={18} color="#16a34a" />
            <Text className="text-[13px] font-bold text-green-700 flex-1">
              {section === 'personal'
                ? 'Tus datos personales se guardaron correctamente'
                : 'Tu perfil profesional se actualizó correctamente'}
            </Text>
          </View>
        )}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Distintivo de la sección ── */}
          <View
            className="flex-row items-center gap-3 rounded-3xl p-4 mb-6"
            style={{ backgroundColor: meta.bg }}
          >
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center"
              style={{ backgroundColor: meta.color }}
            >
              <SectionIcon size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-extrabold text-[16px]" style={{ color: meta.color }}>
                {meta.title}
              </Text>
              <Text className="text-[12px] text-gray-500 font-medium mt-0.5">
                {meta.subtitle}
              </Text>
            </View>
          </View>

          {/* ══════════ SECCIÓN: DATOS PERSONALES ══════════ */}
          {section === 'personal' && (
            <>
              {/* Avatar */}
              <View className="items-center mb-8">
                <View className="relative">
                  <View className="w-28 h-28 rounded-[32px] bg-white p-1.5 shadow-xl">
                    <View className="w-full h-full bg-gray-100 rounded-[26px] items-center justify-center">
                      <Text className="text-4xl font-extrabold text-gray-400">{initials}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full items-center justify-center shadow-lg border-4 border-[#f8f9fb]"
                    style={{ backgroundColor: meta.color }}
                    onPress={() => Alert.alert('Próximamente', 'La carga de foto estará disponible pronto 📸')}
                  >
                    <Camera size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-5">
                <Field icon={UserIcon} label="Nombre Completo" accent={meta.color}>
                  <TextInput
                    value={formData.name}
                    onChangeText={set('name')}
                    placeholder="Tu nombre completo"
                    className="bg-[#f8f9fb] rounded-2xl px-5 py-4 font-bold text-[15px] text-[#111]"
                    placeholderTextColor="#9ca3af"
                  />
                </Field>

                <Field icon={Mail} label="Correo Electrónico" accent={meta.color} disabled={isOAuth}>
                  <TextInput
                    value={formData.email}
                    onChangeText={isOAuth ? undefined : set('email')}
                    editable={!isOAuth}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="correo@ejemplo.com"
                    className={`rounded-2xl px-5 py-4 font-bold text-[15px] ${isOAuth ? 'bg-gray-100 text-gray-500' : 'bg-[#f8f9fb] text-[#111]'}`}
                    placeholderTextColor="#9ca3af"
                  />
                </Field>

                <Field icon={Phone} label="Número de Celular" accent={meta.color}>
                  <View className="flex-row gap-2">
                    <View className="bg-[#f8f9fb] rounded-2xl px-4 py-4 items-center justify-center">
                      <Text className="font-bold text-[15px] text-gray-500">+57</Text>
                    </View>
                    <TextInput
                      value={formData.phone}
                      onChangeText={set('phone')}
                      keyboardType="phone-pad"
                      placeholder="300 000 0000"
                      className="flex-1 bg-[#f8f9fb] rounded-2xl px-5 py-4 font-bold text-[15px] text-[#111]"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </Field>

                <View className="mb-0">
                  <Field icon={MapPin} label="Ciudad Principal" accent={meta.color}>
                    <TextInput
                      value={formData.city}
                      onChangeText={set('city')}
                      placeholder="Ej. Medellín, Envigado..."
                      className="bg-[#f8f9fb] rounded-2xl px-5 py-4 font-bold text-[15px] text-[#111]"
                      placeholderTextColor="#9ca3af"
                    />
                  </Field>
                </View>
              </View>
            </>
          )}

          {/* ══════════ SECCIÓN: PERFIL PROFESIONAL ══════════ */}
          {section === 'professional' && (
            <>
              <View className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-5 mb-5">
                {/* Bio */}
                <Field icon={FileText} label="Descripción / Bio" accent={meta.color}>
                  <TextInput
                    value={workerProfile.bio}
                    onChangeText={setWP('bio')}
                    placeholder="Cuéntanos sobre ti y tu experiencia..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="bg-[#f8f9fb] rounded-2xl px-5 py-4 font-medium text-[14px] text-[#111]"
                    placeholderTextColor="#9ca3af"
                    style={{ minHeight: 100 }}
                  />
                </Field>

                {/* Años de experiencia */}
                <Field icon={Star} label="Años de experiencia" accent={meta.color}>
                  <TextInput
                    value={workerProfile.years_experience}
                    onChangeText={setWP('years_experience')}
                    keyboardType="numeric"
                    placeholder="Ej: 5"
                    className="bg-[#f8f9fb] rounded-2xl px-5 py-4 font-bold text-[15px] text-[#111]"
                    placeholderTextColor="#9ca3af"
                  />
                </Field>

                {/* Ciudades donde trabaja */}
                <Field icon={MapPin} label="Ciudades donde trabajas" accent={meta.color}>
                  <TextInput
                    value={workerProfile.cities_covered}
                    onChangeText={setWP('cities_covered')}
                    placeholder="Medellín, Bogotá, Cali..."
                    className="bg-[#f8f9fb] rounded-2xl px-5 py-4 font-bold text-[15px] text-[#111]"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text className="text-[11px] text-gray-400 mt-1.5 ml-1">
                    Separa las ciudades con comas
                  </Text>
                </Field>
              </View>

              {/* Especialidades */}
              <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                Especialidades
              </Text>
              <View className="bg-white rounded-[28px] shadow-sm border border-gray-100 p-5">
                <View className="flex-row items-center gap-2 mb-4 ml-1">
                  <Briefcase size={14} color={meta.color} />
                  <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">
                    Selecciona los servicios que ofreces
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  {SPECIALTIES.map(({ key, label }) => {
                    const active = workerProfile.specialties.includes(key);
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => toggleSpecialty(key)}
                        className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-2xl border"
                        style={{
                          backgroundColor: active ? meta.color : '#fff',
                          borderColor: active ? meta.color : '#e5e7eb',
                        }}
                        activeOpacity={0.8}
                      >
                        {active && <Check size={13} color="#fff" strokeWidth={3} />}
                        <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-gray-600'}`}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* ── Botón guardar grande ── */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || saved}
            className="flex-row items-center justify-center gap-2 rounded-2xl py-4 mt-6"
            style={{ backgroundColor: saved ? '#16a34a' : meta.color }}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saved ? (
              <>
                <CheckCircle size={18} color="#fff" />
                <Text className="text-white font-bold text-[15px]">Cambios guardados</Text>
              </>
            ) : (
              <Text className="text-white font-bold text-[15px]">Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
