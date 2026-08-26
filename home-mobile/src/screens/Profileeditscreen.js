import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, Camera, User as UserIcon, Mail,
  Phone, MapPin, FileText, Star, Briefcase, Check, CheckCircle,
  DollarSign, CalendarDays, FileSignature, Images, Plus, Trash2, X,
} from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import api from '../services/api';
import { Button, IconButton, BackButton, Card, Input } from '../components/ui';

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
const SPECIALTY_LABEL = Object.fromEntries(SPECIALTIES.map(s => [s.key, s.label]));
const PORTFOLIO_LIMIT = 20;

/*
 * Identidad de cada sección — acento por sección (indigo/violeta), no un
 * estado de proyecto ni una decisión meramente decorativa: es la forma en
 * que la pantalla distingue "datos personales" de "perfil profesional" en
 * cada elemento (insignia, avatar, CTA). No coincide con ningún token
 * semántico del Design System, así que se queda como color local, igual que
 * el mapa PRIORITY_UI del piloto (Projectdetailscreen.js).
 */
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
    daily_rate:       user?.workerProfile?.daily_rate ? String(user.workerProfile.daily_rate) : '',
    contract_pricing_note: user?.workerProfile?.contract_pricing_note || '',
  });
  const [pricingModes, setPricingModes] = useState(
    new Set(user?.workerProfile?.pricing_modes || [])
  );

  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /* ── Portafolio (solo trabajadores) ── */
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [portfolioModal, setPortfolioModal] = useState(null); // { asset, specialty, caption } | null
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (section !== 'professional' || !isWorker) return;
    api.get('/users/me/portfolio')
      .then(res => setPortfolio(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingPortfolio(false));
  }, [section, isWorker]);

  const set    = (field) => (val) => { setSaved(false); setFormData(f    => ({ ...f, [field]: val })); };
  const setWP  = (field) => (val) => { setSaved(false); setWorkerProfile(p => ({ ...p, [field]: val })); };

  const toggleSpecialty = (key) => {
    setSaved(false);
    setWorkerProfile(p => {
      const has = p.specialties.includes(key);
      return { ...p, specialties: has ? p.specialties.filter(s => s !== key) : [...p.specialties, key] };
    });
  };

  const togglePricingMode = (mode) => {
    setSaved(false);
    setPricingModes(prev => {
      const next = new Set(prev);
      next.has(mode) ? next.delete(mode) : next.add(mode);
      return next;
    });
  };

  const handleSave = async () => {
    if (section === 'personal' && !formData.name.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    if (section === 'professional' && pricingModes.size === 0) {
      Alert.alert('Error', 'Elige al menos una modalidad de cobro');
      return;
    }
    if (section === 'professional' && pricingModes.has('por_dia') && !workerProfile.daily_rate) {
      Alert.alert('Error', 'Indica tu tarifa por día');
      return;
    }
    if (section === 'professional' && pricingModes.has('por_contrato') && !workerProfile.contract_pricing_note.trim()) {
      Alert.alert('Error', 'Describe cómo cotizas tus contratos');
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
          pricing_modes:    Array.from(pricingModes),
          daily_rate:       pricingModes.has('por_dia') && workerProfile.daily_rate
            ? Number(workerProfile.daily_rate)
            : null,
          contract_pricing_note: pricingModes.has('por_contrato') && workerProfile.contract_pricing_note
            ? workerProfile.contract_pricing_note.trim()
            : null,
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

  const uploadAvatar = async (asset) => {
    setUploadingAvatar(true);
    try {
      const avatarData = new FormData();
      avatarData.append('avatar', {
        uri: asset.uri,
        name: asset.fileName || `avatar-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      await api.post('/users/me/avatar', avatarData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMe();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickAvatarImage = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Debes conceder acceso para cambiar tu foto de perfil.');
      return;
    }
    const options = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [1, 1] };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;
    await uploadAvatar(result.assets[0]);
  };

  const handleChangeAvatar = () => {
    Alert.alert('Foto de perfil', '¿Cómo quieres agregarla?', [
      { text: 'Tomar foto', onPress: () => pickAvatarImage('camera') },
      { text: 'Elegir de la galería', onPress: () => pickAvatarImage('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  /* ── Portafolio ── */
  const pickPortfolioImage = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Debes conceder acceso para agregar una foto.');
      return;
    }
    const options = { mediaTypes: ['images'], quality: 0.7 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;
    setPortfolioModal({ asset: result.assets[0], specialty: workerProfile.specialties[0] || null, caption: '' });
  };

  const handleAddPortfolioPhoto = () => {
    if (workerProfile.specialties.length === 0) {
      Alert.alert('Agrega tus especialidades primero', 'Selecciona al menos una especialidad arriba antes de subir fotos de tu trabajo.');
      return;
    }
    if (portfolio.length >= PORTFOLIO_LIMIT) {
      Alert.alert('Portafolio lleno', `Alcanzaste el máximo de ${PORTFOLIO_LIMIT} fotos. Elimina alguna antes de subir otra.`);
      return;
    }
    Alert.alert('Foto de tu trabajo', '¿Cómo quieres agregarla?', [
      { text: 'Tomar foto', onPress: () => pickPortfolioImage('camera') },
      { text: 'Elegir de la galería', onPress: () => pickPortfolioImage('library') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const submitPortfolioPhoto = async () => {
    if (!portfolioModal?.specialty) {
      Alert.alert('Falta la especialidad', 'Elige a qué especialidad corresponde esta foto.');
      return;
    }
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append('photo', {
        uri: portfolioModal.asset.uri,
        name: portfolioModal.asset.fileName || `portfolio-${Date.now()}.jpg`,
        type: portfolioModal.asset.mimeType || 'image/jpeg',
      });
      data.append('specialty', portfolioModal.specialty);
      if (portfolioModal.caption.trim()) data.append('caption', portfolioModal.caption.trim());

      const res = await api.post('/users/me/portfolio', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPortfolio(prev => [res.data.data, ...prev]);
      setPortfolioModal(null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const deletePortfolioPhoto = (photo) => {
    Alert.alert('Eliminar foto', '¿Seguro que quieres quitarla de tu portafolio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/users/me/portfolio/${photo.id}`);
            setPortfolio(prev => prev.filter(p => p.id !== photo.id));
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'No se pudo eliminar la foto.');
          }
        },
      },
    ]);
  };

  const SectionIcon = meta.Icon;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">

        {/* ── Header ── */}
        <View className="bg-surface px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-100">
          <View className="flex-row items-center gap-3 flex-1 min-w-0">
            <BackButton onPress={() => navigation.goBack()} />
            <Text className="font-extrabold text-[17px] text-ink flex-1" numberOfLines={1}>
              {meta.title}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || saved}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Datos guardados' : 'Guardar'}
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
                  <View className="w-28 h-28 rounded-[32px] bg-surface p-1.5 shadow-xl">
                    <View className="w-full h-full bg-gray-100 rounded-[26px] items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <Image source={{ uri: user.avatar }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <Text className="text-4xl font-extrabold text-gray-400">{initials}</Text>
                      )}
                      {uploadingAvatar && (
                        <View className="absolute inset-0 bg-black/40 items-center justify-center">
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      )}
                    </View>
                  </View>
                  <IconButton
                    icon={Camera}
                    accessibilityLabel="Cambiar foto de perfil"
                    iconColor="#fff"
                    onPress={handleChangeAvatar}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 !border-4 !border-background shadow-lg"
                    style={{ backgroundColor: meta.color, opacity: uploadingAvatar ? 0.6 : 1 }}
                  />
                </View>
              </View>

              <Card padding="lg">
                <Field icon={UserIcon} label="Nombre Completo" accent={meta.color}>
                  <Input
                    value={formData.name}
                    onChangeText={set('name')}
                    placeholder="Tu nombre completo"
                    className="font-bold text-[15px] text-ink"
                  />
                </Field>

                <Field icon={Mail} label="Correo Electrónico" accent={meta.color} disabled={isOAuth}>
                  <Input
                    value={formData.email}
                    onChangeText={isOAuth ? undefined : set('email')}
                    editable={!isOAuth}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="correo@ejemplo.com"
                    className={`font-bold text-[15px] ${isOAuth ? 'bg-gray-100 text-gray-500' : 'text-ink'}`}
                  />
                </Field>

                <Field icon={Phone} label="Número de Celular" accent={meta.color}>
                  <View className="flex-row gap-2">
                    <View className="bg-background rounded-2xl px-4 py-4 items-center justify-center">
                      <Text className="font-bold text-[15px] text-gray-500">+57</Text>
                    </View>
                    <Input
                      value={formData.phone}
                      onChangeText={set('phone')}
                      keyboardType="phone-pad"
                      placeholder="300 000 0000"
                      className="flex-1 font-bold text-[15px] text-ink"
                    />
                  </View>
                </Field>

                <View className="mb-0">
                  <Field icon={MapPin} label="Ciudad Principal" accent={meta.color}>
                    <Input
                      value={formData.city}
                      onChangeText={set('city')}
                      placeholder="Ej. Medellín, Envigado..."
                      className="font-bold text-[15px] text-ink"
                    />
                  </Field>
                </View>
              </Card>
            </>
          )}

          {/* ══════════ SECCIÓN: PERFIL PROFESIONAL ══════════ */}
          {section === 'professional' && (
            <>
              <Card padding="lg" className="mb-5">
                {/* Bio */}
                <Field icon={FileText} label="Descripción / Bio" accent={meta.color}>
                  <Input
                    value={workerProfile.bio}
                    onChangeText={setWP('bio')}
                    placeholder="Cuéntanos sobre ti y tu experiencia..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    className="font-medium text-[14px] text-ink"
                    style={{ minHeight: 100 }}
                  />
                </Field>

                {/* Años de experiencia */}
                <Field icon={Star} label="Años de experiencia" accent={meta.color}>
                  <Input
                    value={workerProfile.years_experience}
                    onChangeText={setWP('years_experience')}
                    keyboardType="numeric"
                    placeholder="Ej: 5"
                    className="font-bold text-[15px] text-ink"
                  />
                </Field>

                {/* Ciudades donde trabaja */}
                <Field icon={MapPin} label="Ciudades donde trabajas" accent={meta.color}>
                  <Input
                    value={workerProfile.cities_covered}
                    onChangeText={setWP('cities_covered')}
                    placeholder="Medellín, Bogotá, Cali..."
                    className="font-bold text-[15px] text-ink"
                  />
                  <Text className="text-[11px] text-gray-400 mt-1.5 ml-1">
                    Separa las ciudades con comas
                  </Text>
                </Field>
              </Card>

              {/* Modalidad de cobro */}
              <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">
                Cómo cobras
              </Text>
              <Text className="text-[11px] text-gray-400 mb-3 ml-1">
                Por día define un precio fijo. Por contrato no hay un número único — depende de m², materiales y alcance — así que describes cómo cotizas y defines el monto al aceptar cada solicitud.
              </Text>
              <Card padding="lg" className="mb-5">
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
                          backgroundColor: active ? '#fff7ed' : '#fafafa',
                          borderColor: active ? meta.color : '#e5e7eb',
                        }}
                        activeOpacity={0.85}
                      >
                        <Icon size={20} color={active ? meta.color : '#9ca3af'} />
                        <Text className="text-[13px] font-black" style={{ color: active ? meta.color : '#6b7280' }}>
                          {label}
                        </Text>
                        <Text className="text-[10px] text-gray-400 leading-tight">{hint}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {pricingModes.has('por_dia') && (
                  <Field icon={DollarSign} label="Precio fijo por día ($)" accent={meta.color}>
                    <Input
                      value={workerProfile.daily_rate}
                      onChangeText={setWP('daily_rate')}
                      keyboardType="numeric"
                      placeholder="Ej: 120000"
                      className="font-bold text-[15px] text-ink"
                    />
                  </Field>
                )}

                {pricingModes.has('por_contrato') && (
                  <Field icon={FileText} label="¿Cómo cotizas tus contratos?" accent={meta.color}>
                    <Input
                      value={workerProfile.contract_pricing_note}
                      onChangeText={setWP('contract_pricing_note')}
                      placeholder="Ej: Cotizo según m² y materiales, te confirmo el precio después de revisar el trabajo"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      className="font-medium text-[14px] text-ink"
                      style={{ minHeight: 80 }}
                    />
                  </Field>
                )}
              </Card>

              {/* Especialidades */}
              <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                Especialidades
              </Text>
              <Card padding="lg">
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
              </Card>

              {/* Portafolio */}
              <View className="flex-row items-center justify-between mt-6 mb-3 ml-1 mr-1">
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">
                  Portafolio de trabajos
                </Text>
                <Text className="text-[11px] text-gray-400 font-medium">{portfolio.length}/{PORTFOLIO_LIMIT}</Text>
              </View>
              <Card padding="lg">
                <View className="flex-row items-center gap-2 mb-4 ml-1">
                  <Images size={14} color={meta.color} />
                  <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wide flex-1">
                    Fotos de trabajos que ya realizaste
                  </Text>
                </View>

                {loadingPortfolio ? (
                  <ActivityIndicator size="small" color={meta.color} className="py-6" />
                ) : (
                  <View className="flex-row flex-wrap gap-2.5">
                    {portfolio.map(photo => (
                      <View key={photo.id} style={{ width: '31%', aspectRatio: 1 }}>
                        <Image source={{ uri: photo.url }} className="w-full h-full rounded-2xl" resizeMode="cover" />
                        <View className="absolute bottom-1 left-1 right-1 bg-black/50 rounded-lg px-1.5 py-0.5">
                          <Text className="text-white text-[9px] font-bold text-center" numberOfLines={1}>
                            {SPECIALTY_LABEL[photo.specialty] || photo.specialty}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deletePortfolioPhoto(photo)}
                          accessibilityRole="button"
                          accessibilityLabel="Eliminar foto del portafolio"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 items-center justify-center"
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Trash2 size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity
                      onPress={handleAddPortfolioPhoto}
                      accessibilityRole="button"
                      accessibilityLabel="Agregar foto al portafolio"
                      className="items-center justify-center rounded-2xl border-2 border-dashed"
                      style={{ width: '31%', aspectRatio: 1, borderColor: meta.color }}
                      activeOpacity={0.7}
                    >
                      <Plus size={22} color={meta.color} />
                    </TouchableOpacity>
                  </View>
                )}

                {!loadingPortfolio && portfolio.length === 0 && (
                  <Text className="text-[12px] text-gray-400 mt-3 text-center">
                    Muestra tu trabajo para generar confianza con los clientes.
                  </Text>
                )}
              </Card>
            </>
          )}

          {/* ── Botón guardar grande ── */}
          <Button
            variant="primary"
            fullWidth
            loading={saving}
            disabled={saving || saved}
            onPress={handleSave}
            accessibilityLabel={saved ? 'Cambios guardados' : 'Guardar cambios'}
            className={`mt-6 ${saved ? '!opacity-100' : ''}`}
            style={{ backgroundColor: saved ? '#16a34a' : meta.color }}
          >
            {!saving && (
              saved ? (
                <View className="flex-row items-center gap-2">
                  <CheckCircle size={18} color="#fff" />
                  <Text className="text-white font-bold text-[15px]">Cambios guardados</Text>
                </View>
              ) : (
                'Guardar cambios'
              )
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal: agregar foto al portafolio ── */}
      <Modal visible={!!portfolioModal} transparent animationType="slide" onRequestClose={() => setPortfolioModal(null)}>
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={() => !uploadingPhoto && setPortfolioModal(null)} />
          <View className="bg-surface rounded-t-3xl px-6 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-[18px] font-extrabold text-ink">Agregar al portafolio</Text>
              <IconButton icon={X} accessibilityLabel="Cerrar" onPress={() => setPortfolioModal(null)} disabled={uploadingPhoto} />
            </View>

            {portfolioModal && (
              <>
                <Image source={{ uri: portfolioModal.asset.uri }} className="w-full h-48 rounded-2xl mb-4" resizeMode="cover" />

                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">Especialidad</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {workerProfile.specialties.map(key => {
                    const active = portfolioModal.specialty === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setPortfolioModal(m => ({ ...m, specialty: key }))}
                        className="px-4 py-2 rounded-2xl border"
                        style={{ backgroundColor: active ? meta.color : '#fff', borderColor: active ? meta.color : '#e5e7eb' }}
                        activeOpacity={0.8}
                      >
                        <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-gray-600'}`}>
                          {SPECIALTY_LABEL[key] || key}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 ml-1">Descripción (opcional)</Text>
                <Input
                  value={portfolioModal.caption}
                  onChangeText={(v) => setPortfolioModal(m => ({ ...m, caption: v }))}
                  placeholder="Ej: Pintura de fachada, 120m²"
                  className="font-medium text-[14px] text-ink mb-5"
                />

                <Button
                  variant="primary"
                  fullWidth
                  loading={uploadingPhoto}
                  disabled={uploadingPhoto}
                  onPress={submitPortfolioPhoto}
                  accessibilityLabel="Subir foto"
                >
                  Subir foto
                </Button>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
