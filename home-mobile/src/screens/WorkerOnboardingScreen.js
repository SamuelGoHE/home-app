import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase, FileText, Star, MapPin, Check, Rocket,
  DollarSign, CalendarDays, FileSignature,
} from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import api from '../services/api';
import { Card } from '../components/ui';

// Acento decorativo exclusivo de este flujo de onboarding — deliberadamente
// distinto del brand (rojo) para diferenciarlo visualmente del resto de la
// app, igual que RATING_COLOR en Projectdetailscreen.js. No representa un
// estado de proyecto/tarea (no va a status.js) y no coincide con ningún
// token existente, así que se queda como constante local.
const ACCENT = '#8b5cf6';

/**
 * Colores literales necesarios para props que no aceptan clases de Tailwind
 * (íconos lucide-react-native, fondos/bordes dinámicos según selección).
 */
const ICON = {
  placeholder: '#9ca3af', // = placeholderTextColor de components/ui/Input.js
  muted: '#6b7280',       // = tokens.colors.muted
  border: '#e5e7eb',      // = tokens.colors.border
  surface: '#ffffff',     // = tokens.colors.surface.DEFAULT
};

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

/* ─── Campo ──────────────────────────────────────────────────────── */
function Field({ icon: Icon, label, children, hint }) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-2 mb-2 ml-1">
        <Icon size={14} color={ACCENT} />
        <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">{label}</Text>
      </View>
      {children}
      {hint ? (
        <Text className="text-[11px] text-gray-400 mt-1.5 ml-1">{hint}</Text>
      ) : null}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WORKER ONBOARDING — se muestra una sola vez tras el registro
══════════════════════════════════════════════════════════════════ */
export default function WorkerOnboardingScreen() {
  const { user, fetchMe, completeWorkerOnboarding } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] || 'Profesional';

  const [profile, setProfile] = useState({
    bio: '',
    years_experience: '',
    specialties: [],
    cities_covered: user?.city || '',
    daily_rate: '',
    contract_pricing_note: '',
  });
  const [pricingModes, setPricingModes] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const set = (field) => (val) => setProfile(p => ({ ...p, [field]: val }));

  const toggleSpecialty = (key) => {
    setProfile(p => {
      const has = p.specialties.includes(key);
      return { ...p, specialties: has ? p.specialties.filter(s => s !== key) : [...p.specialties, key] };
    });
  };

  const togglePricingMode = (mode) => {
    setPricingModes(prev => {
      const next = new Set(prev);
      next.has(mode) ? next.delete(mode) : next.add(mode);
      return next;
    });
  };

  const isComplete = profile.specialties.length > 0
    && profile.cities_covered.trim()
    && pricingModes.size > 0
    && (!pricingModes.has('por_dia') || profile.daily_rate)
    && (!pricingModes.has('por_contrato') || profile.contract_pricing_note.trim());

  const handleSave = async () => {
    if (!isComplete) {
      Alert.alert('Falta información', 'Selecciona al menos una especialidad, una ciudad y cómo cobras para que los clientes puedan encontrarte y contratarte.');
      return;
    }
    setSaving(true);
    try {
      const citiesArray = profile.cities_covered
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      await api.put('/users/worker-profile', {
        bio:              profile.bio,
        years_experience: profile.years_experience ? Number(profile.years_experience) : 0,
        specialties:      profile.specialties,
        cities_covered:   citiesArray,
        pricing_modes:    Array.from(pricingModes),
        daily_rate:       pricingModes.has('por_dia') && profile.daily_rate
          ? Number(profile.daily_rate)
          : null,
        contract_pricing_note: pricingModes.has('por_contrato') && profile.contract_pricing_note
          ? profile.contract_pricing_note.trim()
          : null,
      });

      await fetchMe();
      completeWorkerOnboarding();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar tu perfil. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Completar después',
      'Sin tu perfil profesional los clientes no podrán encontrarte. Podrás completarlo en Perfil → Mi perfil profesional.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Omitir por ahora', onPress: () => completeWorkerOnboarding() },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Bienvenida ── */}
          <View
            className="rounded-3xl p-6 mb-6 overflow-hidden relative"
            style={{ backgroundColor: ACCENT }}
          >
            <View className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
            <View className="absolute -right-1 top-14 w-16 h-16 bg-white/10 rounded-full" />

            <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center mb-4">
              <Rocket size={24} color={ICON.surface} />
            </View>
            <Text className="text-white text-[22px] font-extrabold leading-tight">
              ¡Bienvenido, {firstName}! 🎉
            </Text>
            <Text className="text-white/85 text-[13px] mt-2 leading-relaxed">
              Configura tu perfil profesional para que los clientes puedan encontrarte y contratarte. Solo te tomará un minuto.
            </Text>
          </View>

          {/* ── Formulario ── */}
          <Card padding="md" className="mb-5">
            <Field icon={FileText} label="Descripción / Bio">
              <TextInput
                value={profile.bio}
                onChangeText={set('bio')}
                placeholder="Cuéntanos sobre ti y tu experiencia..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-background rounded-2xl px-5 py-4 font-medium text-[14px] text-ink"
                placeholderTextColor={ICON.placeholder}
                style={{ minHeight: 100 }}
              />
            </Field>

            <Field icon={Star} label="Años de experiencia">
              <TextInput
                value={profile.years_experience}
                onChangeText={set('years_experience')}
                keyboardType="numeric"
                placeholder="Ej: 5"
                className="bg-background rounded-2xl px-5 py-4 font-bold text-[15px] text-ink"
                placeholderTextColor={ICON.placeholder}
              />
            </Field>

            <Field icon={MapPin} label="Ciudades donde trabajas *" hint="Separa las ciudades con comas">
              <TextInput
                value={profile.cities_covered}
                onChangeText={set('cities_covered')}
                placeholder="Medellín, Bogotá, Cali..."
                className="bg-background rounded-2xl px-5 py-4 font-bold text-[15px] text-ink"
                placeholderTextColor={ICON.placeholder}
              />
            </Field>
          </Card>

          {/* ── Especialidades ── */}
          <Card padding="md" className="mb-6">
            <View className="flex-row items-center gap-2 mb-4 ml-1">
              <Briefcase size={14} color={ACCENT} />
              <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">
                Selecciona los servicios que ofreces *
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {SPECIALTIES.map(({ key, label }) => {
                const active = profile.specialties.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggleSpecialty(key)}
                    className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-2xl border"
                    style={{
                      backgroundColor: active ? ACCENT : ICON.surface,
                      borderColor: active ? ACCENT : ICON.border,
                    }}
                    activeOpacity={0.8}
                  >
                    {active && <Check size={13} color={ICON.surface} strokeWidth={3} />}
                    <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-gray-600'}`}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* ── Cómo cobras ── */}
          <Card padding="md" className="mb-6">
            <View className="flex-row items-center gap-2 mb-1 ml-1">
              <DollarSign size={14} color={ACCENT} />
              <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wide">
                Cómo cobras *
              </Text>
            </View>
            <Text className="text-[11px] text-gray-400 mb-4 ml-1">
              Por día define un precio fijo. Por contrato no hay un número único — depende de m², materiales y alcance — así que describes cómo cotizas y defines el monto al aceptar cada solicitud.
            </Text>

            <View className="flex-row gap-3 mb-4">
              {[
                { key: 'por_dia', label: 'Por día', hint: 'Precio fijo por jornada', Icon: CalendarDays },
                { key: 'por_contrato', label: 'Por contrato', hint: 'Cotizas cada trabajo', Icon: FileSignature },
              ].map(({ key, label, hint, Icon }) => {
                const active = pricingModes.has(key);
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => togglePricingMode(key)}
                    className="flex-1 items-start gap-2 p-4 rounded-2xl border"
                    style={{
                      // Sub-tonos decorativos del acento violeta (sin token
                      // equivalente) — ver comentario de ACCENT arriba.
                      backgroundColor: active ? '#f5f3ff' : '#fafafa',
                      borderColor: active ? ACCENT : ICON.border,
                    }}
                    activeOpacity={0.85}
                  >
                    <Icon size={20} color={active ? ACCENT : ICON.placeholder} />
                    <Text className="text-[13px] font-black" style={{ color: active ? ACCENT : ICON.muted }}>
                      {label}
                    </Text>
                    <Text className="text-[10px] text-gray-400 leading-tight">{hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {pricingModes.has('por_dia') && (
              <Field icon={DollarSign} label="Precio fijo por día ($)">
                <TextInput
                  value={profile.daily_rate}
                  onChangeText={set('daily_rate')}
                  keyboardType="numeric"
                  placeholder="Ej: 120000"
                  className="bg-background rounded-2xl px-5 py-4 font-bold text-[15px] text-ink"
                  placeholderTextColor={ICON.placeholder}
                />
              </Field>
            )}

            {pricingModes.has('por_contrato') && (
              <Field icon={FileText} label="¿Cómo cotizas tus contratos?">
                <TextInput
                  value={profile.contract_pricing_note}
                  onChangeText={set('contract_pricing_note')}
                  placeholder="Ej: Cotizo según m² y materiales, te confirmo el precio después de revisar el trabajo"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="bg-background rounded-2xl px-5 py-4 font-medium text-[14px] text-ink"
                  placeholderTextColor={ICON.placeholder}
                  style={{ minHeight: 80 }}
                />
              </Field>
            )}
          </Card>

          {/* ── Botones ── */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="flex-row items-center justify-center gap-2 rounded-2xl py-4"
            style={{ backgroundColor: isComplete ? ACCENT : ICON.border }}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color={ICON.surface} />
            ) : (
              <Text className={`font-bold text-[15px] ${isComplete ? 'text-white' : 'text-gray-400'}`}>
                Guardar y comenzar 🚀
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSkip} className="items-center py-4">
            <Text className="text-[13px] font-semibold text-gray-400">Completar después</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
