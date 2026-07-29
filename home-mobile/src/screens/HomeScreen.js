import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, Image, ActivityIndicator, Modal,
} from 'react-native';
import { Bell, Search, ChevronRight, Star, Zap, TrendingUp, X, CheckCircle, AlertCircle, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../context/authStore';
import { useServices, useProjects } from '../hooks/useApi';
import { useNotifications } from '../hooks/useNotifications';

const CATEGORY_META = {
  pintura:          { img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop' },
  enchapes:         { img: 'https://images.unsplash.com/photo-1521783593447-5702b9bfd267?w=600&h=400&fit=crop' },
  electricidad:     { img: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=600&h=400&fit=crop' },
  plomeria:         { img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=400&fit=crop' },
  obra_gris:        { img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop' },
  carpinteria:      { img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop' },
  impermeabilizacion: { img: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&h=400&fit=crop' },
  otro:             { img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop' },
};

const PLACEHOLDER_IMG = 'https://via.placeholder.com/600x400?text=Servicio';

const getServiceImage = (svc) =>
  svc?.image_url || CATEGORY_META[svc?.category]?.img || CATEGORY_META.otro.img || PLACEHOLDER_IMG;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '¡Buenos días';
  if (h < 19) return '¡Buenas tardes';
  return '¡Buenas noches';
}

/* ─── Status badge ───────────────────────────────────────────────── */
const STATUS_LABELS = {
  pendiente: { label: 'Pendiente', bg: '#f3f4f6', color: '#4b5563' },
  en_revision: { label: 'En revisión', bg: '#fef3c7', color: '#d97706' },
  aprobado: { label: 'Aprobado', bg: '#dbeafe', color: '#2563eb' },
  en_progreso: { label: 'En progreso', bg: '#ffedd5', color: '#ea580c' },
  completado: { label: 'Completado', bg: '#d1fae5', color: '#059669' },
  cancelado: { label: 'Cancelado', bg: '#fee2e2', color: '#dc2626' },
};

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || STATUS_LABELS.pendiente;
  return (
    <View className="px-2 py-0.5 rounded-lg" style={{ backgroundColor: s.bg }}>
      <Text className="text-[10px] font-bold" style={{ color: s.color }}>{s.label}</Text>
    </View>
  );
}

const NOTIF_ICONS = {
  quote_pending:   { Icon: Clock,         color: '#f59e0b' },
  quote_approved:  { Icon: CheckCircle,   color: '#10b981' },
  quote_rejected:  { Icon: AlertCircle,   color: '#ef4444' },
  project_active:  { Icon: TrendingUp,    color: '#3b82f6' },
  project_completed: { Icon: CheckCircle, color: '#10b981' },
};

export default function HomeScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);

  const { user } = useAuthStore();
  const { data: services, loading: loadingSvc } = useServices();
  const { data: projects, loading: loadingProj } = useProjects();
  const { notifications, hasUnreadNotifs, dismiss, dismissAll } = useNotifications();

  const firstName = user?.name?.split(' ')[0] || 'Invitado';
  const greeting = getGreeting();

  const activeProjects = (projects || [])
    .filter(p => ['en_progreso', 'pendiente', 'aprobado'].includes(p.status))
    .slice(0, 3);

  const uniqueCategories = services
    ? [...new Map(services.map(s => [s.category, s])).values()]
    : [];

  const topServices = services ? services.slice(0, 5) : [];

  const searchResults = search.trim() && services
    ? services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 6)
    : [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* ── Header ── */}
      <View className="px-5 pt-4 pb-4 flex-row items-center justify-between border-b border-gray-50">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-[#E8432D] items-center justify-center">
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} className="w-full h-full rounded-full" />
            ) : (
              <Text className="text-white font-bold text-sm">
                {(firstName[0] || 'I').toUpperCase()}
              </Text>
            )}
          </View>
          <View>
            <Text className="text-[12px] text-gray-400 font-medium">{greeting},</Text>
            <Text className="text-[16px] font-extrabold text-[#111]">{firstName}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowNotifs(true)}
          className="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 items-center justify-center"
        >
          <Bell size={18} color="#4b5563" />
          {hasUnreadNotifs && (
            <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8432D] rounded-full border-2 border-white" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* ── Search Bar ── */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center gap-2.5 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Buscar servicio..."
              value={search}
              onChangeText={setSearch}
              className="flex-1 text-[14px] font-medium text-[#111]"
              placeholderTextColor="#9ca3af"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Dropdown resultados ── */}
          {search.length > 0 && (
            <View className="mt-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {searchResults.length > 0 ? (
                searchResults.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      setSearch('');
                      navigation.navigate('Quote', { serviceId: s.id, serviceName: s.name, serviceCategory: s.category });
                    }}
                    className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                    activeOpacity={0.7}
                  >
                    <Image
                      source={{ uri: getServiceImage(s) }}
                      className="w-10 h-10 rounded-xl"
                      resizeMode="cover"
                    />
                    <View className="flex-1 min-w-0">
                      <Text className="text-[14px] font-semibold text-[#111]" numberOfLines={1}>{s.name}</Text>
                      <Text className="text-[11px] text-gray-400 capitalize">{s.category.replace('_', ' ')}</Text>
                    </View>
                    <ChevronRight size={14} color="#d1d5db" />
                  </TouchableOpacity>
                ))
              ) : (
                <View className="py-6 items-center">
                  <Text className="text-[14px] text-gray-400">Sin resultados para "{search}"</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {!search && (
          <>
            {/* ── Proyectos activos ── */}
            {!loadingProj && activeProjects.length > 0 && (
              <View className="px-5 pt-4 pb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <TrendingUp size={16} color="#E8432D" />
                    <Text className="text-[16px] font-extrabold text-[#111]">Proyectos activos</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('ProjectsTab', { screen: 'ProjectsTabScreen' })}>
                    <Text className="text-[12px] text-[#E8432D] font-bold">Ver todos</Text>
                  </TouchableOpacity>
                </View>
                {activeProjects.map(p => {
                  const tasks = p.tasks || [];
                  const done = tasks.filter(t => t.status === 'completada').length;
                  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => navigation.navigate('ProjectsTab', { screen: 'ProjectDetail', params: { id: p.id } })}
                      className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm"
                      activeOpacity={0.85}
                    >
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 min-w-0 mr-2">
                          <Text className="font-bold text-[14px] text-[#111]" numberOfLines={1}>
                            {p.title || p.service?.name}
                          </Text>
                          <Text className="text-[12px] text-gray-400 mt-0.5">{p.service?.name}</Text>
                        </View>
                        <StatusBadge status={p.status} />
                      </View>
                      {tasks.length > 0 && (
                        <View className="mt-2">
                          <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <View className="h-full bg-[#E8432D] rounded-full" style={{ width: `${pct}%` }} />
                          </View>
                          <Text className="text-[10px] text-gray-400 mt-1 text-right">{done}/{tasks.length} tareas</Text>
                        </View>
                      )}
                      <View className="flex-row items-center gap-1 mt-2">
                        <Text className="text-[12px] text-[#E8432D] font-semibold">Ver detalle</Text>
                        <ChevronRight size={14} color="#E8432D" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ── Categorías ── */}
            <View className="pb-8">
              <View className="flex-row items-center justify-between px-5 mb-3">
                <View className="flex-row items-center gap-2">
                  <Zap size={16} color="#E8432D" />
                  <Text className="text-[16px] font-extrabold text-[#111]">Categorías</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('ServicesTab')}>
                  <Text className="text-[12px] text-[#E8432D] font-bold">Ver todas</Text>
                </TouchableOpacity>
              </View>

              {loadingSvc ? (
                <ActivityIndicator size="large" color="#E8432D" className="py-4" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 pb-2">
                  {uniqueCategories.map(svc => (
                    <TouchableOpacity
                      key={svc.category}
                      onPress={() => navigation.navigate('ServicesTab', {
                        screen: 'ServicesTabScreen',
                        params: { filterCategory: svc.category, _ts: Date.now() },
                      })}
                      className="w-[110px] mr-4 items-center"
                    >
                      <View className="w-full aspect-square rounded-3xl overflow-hidden bg-gray-100 mb-2">
                        <Image source={{ uri: getServiceImage(svc) }} className="w-full h-full" resizeMode="cover" />
                      </View>
                      <Text className="text-[12px] font-bold text-gray-700 capitalize text-center" numberOfLines={1}>
                        {svc.category.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── Más solicitados ── */}
            <View className="pb-8">
              <View className="flex-row items-center justify-between px-5 mb-3">
                <View className="flex-row items-center gap-2">
                  <Star size={16} color="#E8432D" />
                  <Text className="text-[16px] font-extrabold text-[#111]">Más solicitados</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('ServicesTab')}>
                  <Text className="text-[12px] text-[#E8432D] font-bold">Ver todos</Text>
                </TouchableOpacity>
              </View>

              {loadingSvc ? (
                <ActivityIndicator size="large" color="#E8432D" className="py-4" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 pb-2">
                  {topServices.map(svc => (
                    <TouchableOpacity
                      key={svc.id}
                      onPress={() => navigation.navigate('Quote', { serviceId: svc.id, serviceName: svc.name, serviceCategory: svc.category })}
                      className="w-[260px] mr-4 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm"
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: getServiceImage(svc) }} className="w-full h-24" resizeMode="cover" />
                      <View className="px-3 py-3">
                        <Text className="font-bold text-[14px] text-[#111]" numberOfLines={1}>{svc.name}</Text>
                        <Text className="text-[12px] text-gray-400 capitalize mt-0.5">{svc.category.replace('_', ' ')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* ── Banner CTA ── */}
            <View className="px-5 mb-10">
              <View className="bg-[#E8432D] rounded-3xl p-6 overflow-hidden relative">
                <View className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
                <View className="absolute -right-2 top-8 w-14 h-14 bg-white/10 rounded-full" />
                <Text className="text-white font-extrabold text-[18px] mb-1 relative">¿Tienes un proyecto?</Text>
                <Text className="text-white text-[13px] mb-5 opacity-90 relative">
                  Solicita una cotización gratis y recibe propuestas.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ServicesTab')}
                  className="bg-white rounded-full px-6 py-3 self-start"
                  activeOpacity={0.85}
                >
                  <Text className="text-[#E8432D] font-extrabold text-[14px]">Cotizar ahora →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Modal de Notificaciones ── */}
      <Modal visible={showNotifs} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <TouchableOpacity className="flex-1" onPress={() => setShowNotifs(false)} />
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '75%' }}>
            {/* Handle */}
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 bg-gray-200 rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
              <View>
                <Text className="text-[18px] font-extrabold text-[#111]">Notificaciones</Text>
                {notifications.length > 0 && (
                  <Text className="text-[11px] text-gray-400 mt-0.5">{notifications.length} pendiente{notifications.length !== 1 ? 's' : ''}</Text>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                {notifications.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { dismissAll(); setShowNotifs(false); }}
                    className="px-3 py-1.5 bg-gray-100 rounded-xl"
                  >
                    <Text className="text-[12px] font-bold text-gray-500">Limpiar todo</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowNotifs(false)}
                  className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
                >
                  <X size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {notifications.length === 0 ? (
                <View className="items-center py-16 gap-3">
                  <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center">
                    <Bell size={28} color="#d1d5db" />
                  </View>
                  <Text className="text-[15px] font-bold text-gray-400">Todo al día</Text>
                  <Text className="text-[13px] text-gray-300 text-center px-8">
                    No tienes notificaciones pendientes.
                  </Text>
                </View>
              ) : (
                notifications.map(notif => {
                  const meta = NOTIF_ICONS[notif.type] || NOTIF_ICONS.quote_pending;
                  const { Icon } = meta;
                  return (
                    <View
                      key={notif.id}
                      className="flex-row gap-3 px-5 py-4 border-b border-gray-50"
                    >
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: meta.color + '18' }}
                      >
                        <Icon size={18} color={meta.color} strokeWidth={2} />
                      </View>
                      <View className="flex-1 min-w-0">
                        <View className="flex-row items-start justify-between gap-2">
                          <Text className="text-[13px] font-extrabold text-[#111] flex-1" numberOfLines={1}>
                            {notif.title}
                          </Text>
                          <Text className="text-[11px] text-gray-400 flex-shrink-0">{notif.time}</Text>
                        </View>
                        <Text className="text-[12px] text-gray-500 mt-0.5 leading-relaxed" numberOfLines={3}>
                          {notif.message}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => dismiss(notif.id)}
                        className="w-7 h-7 items-center justify-center rounded-full bg-gray-100 flex-shrink-0 mt-1"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={13} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
