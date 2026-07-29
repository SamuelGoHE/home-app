import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, Alert, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LogOut, ChevronRight, User, Star,
  FileText, Settings, HelpCircle, Shield, Bell,
  Briefcase, TrendingUp,
} from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import { useNotifications } from '../hooks/useNotifications';

/* ─── Menú cliente ───────────────────────────────────────────────── */
const CLIENT_MENU = [
  {
    title: '',
    items: [
      { icon: FileText,   label: 'Mis proyectos',        screen: 'ProjectsTab',  params: { screen: 'ProjectsTabScreen' }, iconColor: '#3b82f6', bg: '#eff6ff' },
      { icon: Star,       label: 'Mis calificaciones',   screen: 'MyRatings',    iconColor: '#f59e0b', bg: '#fffbeb' },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { icon: User,    label: 'Mis datos personales',    screen: 'ProfileEdit',  params: { section: 'personal' }, iconColor: '#6366f1', bg: '#eef2ff' },
      { icon: Bell,    label: 'Notificaciones',          screen: null,           iconColor: '#f97316', bg: '#fff7ed', isNotif: true },
      { icon: Shield,  label: 'Seguridad y privacidad',  screen: 'Security',     iconColor: '#10b981', bg: '#ecfdf5' },
    ],
  },
  {
    title: 'Aplicación',
    items: [
      { icon: HelpCircle, label: 'Centro de ayuda',  screen: 'Help',        iconColor: '#6b7280', bg: '#f3f4f6' },
      { icon: Settings,   label: 'Configuración',    screen: 'AppSettings', iconColor: '#6b7280', bg: '#f3f4f6' },
    ],
  },
];

/* ─── Menú trabajador ────────────────────────────────────────────── */
const WORKER_MENU = [
  {
    title: '',
    items: [
      { icon: Briefcase,   label: 'Mis trabajos',          screen: 'ProjectsTab', params: { screen: 'ProjectsTabScreen' }, iconColor: '#3b82f6', bg: '#eff6ff' },
      { icon: Star,        label: 'Mis calificaciones',    screen: 'MyRatings',  iconColor: '#f59e0b', bg: '#fffbeb' },
      { icon: TrendingUp,  label: 'Mi perfil profesional', screen: 'ProfileEdit', params: { section: 'professional' }, iconColor: '#8b5cf6', bg: '#f5f3ff' },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { icon: User,    label: 'Mis datos personales',    screen: 'ProfileEdit',  params: { section: 'personal' }, iconColor: '#6366f1', bg: '#eef2ff' },
      { icon: Bell,    label: 'Notificaciones',          screen: null,           iconColor: '#f97316', bg: '#fff7ed', isNotif: true },
      { icon: Shield,  label: 'Seguridad y privacidad',  screen: 'Security',     iconColor: '#10b981', bg: '#ecfdf5' },
    ],
  },
  {
    title: 'Aplicación',
    items: [
      { icon: HelpCircle, label: 'Centro de ayuda',  screen: 'Help',        iconColor: '#6b7280', bg: '#f3f4f6' },
      { icon: Settings,   label: 'Configuración',    screen: 'AppSettings', iconColor: '#6b7280', bg: '#f3f4f6' },
    ],
  },
];

/* ─── Fila de menú ───────────────────────────────────────────────── */
function MenuItem({ item, onPress, showDot }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0 active:bg-gray-50"
      activeOpacity={0.7}
    >
      <View
        className="w-9 h-9 rounded-2xl items-center justify-center flex-shrink-0"
        style={{ backgroundColor: item.bg }}
      >
        <item.icon size={18} color={item.iconColor} />
      </View>
      <Text className="flex-1 font-semibold text-[15px] text-[#111]">{item.label}</Text>
      {showDot && <View className="w-2 h-2 rounded-full bg-[#E8432D] mr-2" />}
      <ChevronRight size={17} color="#d1d5db" />
    </TouchableOpacity>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { hasUnreadNotifs } = useNotifications();
  const { height } = useWindowDimensions();

  const isWorker = user?.role === 'trabajador';
  const isOAuth = user?.oauth_provider && user.oauth_provider !== 'local';
  const menuGroups = isWorker ? WORKER_MENU : CLIENT_MENU;

  // Tamaños adaptativos según la altura de pantalla
  const isSmall   = height < 700;
  const avatarSize   = isSmall ? 80  : 96;
  const avatarRadius = isSmall ? 22  : 28;
  const headerPb     = isSmall ? 52  : 64;
  const nameSize     = isSmall ? 18  : 22;
  const overlap      = isSmall ? 36  : 44;

  const initials = user?.name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: async () => { await logout(); } },
      ]
    );
  };

  const handleMenuPress = (item) => {
    if (item.isNotif) {
      Alert.alert('Notificaciones', 'Panel de notificaciones próximamente 🔔');
      return;
    }
    if (item.screen) {
      navigation.navigate(item.screen, item.params);
    } else {
      Alert.alert('Próximamente', 'Esta sección estará disponible pronto 🚧');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#E8432D]" edges={['top']}>
      <ScrollView
        className="flex-1 bg-[#f8f9fb]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* ── Header ── */}
        <View
          className="pt-4 px-5 items-center overflow-hidden"
          style={{ backgroundColor: '#E8432D', paddingBottom: headerPb }}
        >
          <View className="absolute rounded-full" style={{ width: 160, height: 160, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -40 }} />
          <View className="absolute rounded-full" style={{ width: 128, height: 128, backgroundColor: 'rgba(0,0,0,0.07)', bottom: 0, left: -40 }} />

          {/* Avatar */}
          <View className="relative mb-3">
            <View
              className="bg-white p-1 shadow-xl"
              style={{ width: avatarSize, height: avatarSize, borderRadius: avatarRadius }}
            >
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{ width: '100%', height: '100%', borderRadius: avatarRadius - 6 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  className="w-full h-full bg-gray-100 items-center justify-center"
                  style={{ borderRadius: avatarRadius - 6 }}
                >
                  <Text
                    className="font-extrabold text-gray-400"
                    style={{ fontSize: isSmall ? 24 : 30 }}
                  >
                    {initials}
                  </Text>
                </View>
              )}
            </View>
            {isOAuth && (
              <View className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
                <View className="w-6 h-6 bg-gray-100 rounded-full items-center justify-center">
                  <Text className="text-[10px] font-bold text-gray-600">
                    {user.oauth_provider === 'google' ? 'G' : user.oauth_provider === 'facebook' ? 'f' : '🍎'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Text
            className="font-extrabold text-white leading-tight text-center"
            style={{ fontSize: nameSize }}
          >
            {user?.name || 'Usuario'}
          </Text>
          <Text className="text-white/80 font-medium mt-0.5" style={{ fontSize: isSmall ? 12 : 14 }}>
            {user?.email}
          </Text>

          <View className="flex-row flex-wrap justify-center gap-2 mt-2">
            <View className="bg-white/20 px-3 py-1 rounded-full border border-white/20">
              <Text className="text-white text-[11px] font-bold">
                {isWorker ? ' Profesional' : ' Cliente'}
              </Text>
            </View>
            {user?.city && (
              <View className="bg-black/20 px-3 py-1 rounded-full border border-black/10">
                <Text className="text-white text-[11px] font-bold"> {user.city}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Grupos de menú ── */}
        <View className="px-4 relative z-10" style={{ marginTop: -overlap, gap: isSmall ? 12 : 16 }}>
          {menuGroups.map((group, gIdx) => (
            <View key={gIdx}>
              {group.title ? (
                <Text className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-2">
                  {group.title}
                </Text>
              ) : null}
              <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                {group.items.map((item, iIdx) => (
                  <MenuItem
                    key={iIdx}
                    item={item}
                    onPress={() => handleMenuPress(item)}
                    showDot={item.isNotif && hasUnreadNotifs}
                  />
                ))}
              </View>
            </View>
          ))}

          {/* Botón cerrar sesión */}
          <TouchableOpacity
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-2 rounded-2xl bg-white border-2 border-red-100 shadow-sm"
            style={{ paddingVertical: isSmall ? 12 : 16 }}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#ef4444" />
            <Text className="text-red-500 font-bold text-[15px]">Cerrar sesión</Text>
          </TouchableOpacity>

          <Text className="text-center text-[11px] font-medium text-gray-400 mb-1">
            HOME App v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
