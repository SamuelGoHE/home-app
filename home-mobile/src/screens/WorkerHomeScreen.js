import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase, MapPin, Calendar, FileText, X,
  CheckCircle2, Clock, ChevronRight, Zap, Star,
} from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import { useProjects } from '../hooks/useApi';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ─── Status UI ──────────────────────────────────────────────────── */
const STATUS_UI = {
  pendiente:   { label: 'Pendiente',   textColor: '#4b5563', bg: '#f3f4f6', Icon: Clock },
  en_revision: { label: 'En revisión', textColor: '#d97706', bg: '#fef3c7', Icon: Clock },
  aprobado:    { label: 'Aprobado',    textColor: '#2563eb', bg: '#dbeafe', Icon: CheckCircle2 },
  en_progreso: { label: 'En progreso', textColor: '#ea580c', bg: '#ffedd5', Icon: Clock },
  completado:  { label: 'Completado',  textColor: '#059669', bg: '#d1fae5', Icon: CheckCircle2 },
  cancelado:   { label: 'Cancelado',   textColor: '#dc2626', bg: '#fee2e2', Icon: X },
};

/* ─── Tarjeta de solicitud entrante ──────────────────────────────── */
function RequestCard({ req, onView, onReject }) {
  return (
    <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 min-w-0 mr-3">
          <Text className="font-extrabold text-[16px] text-[#111]" numberOfLines={1}>
            {req.service?.name || 'Servicio'}
          </Text>
          <Text className="text-[12px] text-gray-400 font-medium mt-0.5">
            {req.client?.name}
          </Text>
        </View>
        <View className="bg-[#E8432D]/10 px-3 py-1 rounded-full">
          <Text className="text-[#E8432D] text-[11px] font-extrabold">Nueva</Text>
        </View>
      </View>

      {/* Info del trabajo */}
      <View className="gap-2 mb-4">
        {req.city ? (
          <View className="flex-row items-center gap-2">
            <MapPin size={13} color="#9ca3af" />
            <Text className="text-[13px] text-gray-500">{req.address ? `${req.address}, ` : ''}{req.city}</Text>
          </View>
        ) : null}
        {req.start_date ? (
          <View className="flex-row items-center gap-2">
            <Calendar size={13} color="#9ca3af" />
            <Text className="text-[13px] text-gray-500">
              {new Date(req.start_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        ) : null}
        {req.notes ? (
          <View className="flex-row items-start gap-2">
            <FileText size={13} color="#9ca3af" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-[13px] text-gray-500 leading-relaxed" numberOfLines={2}>
              {req.notes}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Acciones */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onView}
          className="flex-1 py-3 bg-[#E8432D] rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-extrabold text-[13px]">Ver detalles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onReject}
          className="px-5 py-3 bg-gray-100 rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-gray-500 font-bold text-[13px]">Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Modal de detalle de solicitud ──────────────────────────────── */
function RequestModal({ req, loading, onClose, onAccept, onReject }) {
  if (!req) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[40px] p-6 pb-10">
          {/* Encabezado */}
          <View className="flex-row items-start justify-between mb-5">
            <View className="w-14 h-14 rounded-3xl bg-orange-50 items-center justify-center">
              <Briefcase size={26} color="#E8432D" />
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
            >
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text className="text-[22px] font-extrabold text-[#111] mb-1">Detalles de Solicitud</Text>
          <Text className="text-[13px] text-gray-400 mb-6">
            Revisa los requerimientos antes de aceptar
          </Text>

          <View className="gap-4 mb-7">
            {[
              { label: 'Servicio',   value: req.service?.name,  color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Cliente',    value: req.client?.name,   color: '#6366f1', bg: '#eef2ff' },
              { label: 'Ciudad',     value: req.city,           color: '#10b981', bg: '#ecfdf5' },
              { label: 'Dirección',  value: req.address,        color: '#f97316', bg: '#fff7ed' },
              { label: 'Fecha inicio', value: req.start_date
                ? new Date(req.start_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
                : null, color: '#8b5cf6', bg: '#f5f3ff' },
            ].filter(r => r.value).map(row => (
              <View key={row.label} className="flex-row items-start gap-4">
                <View className="w-10 h-10 rounded-2xl items-center justify-center flex-shrink-0" style={{ backgroundColor: row.bg }}>
                  <Briefcase size={16} color={row.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide">{row.label}</Text>
                  <Text className="text-[14px] font-bold text-[#111] mt-0.5">{row.value}</Text>
                </View>
              </View>
            ))}
            {req.notes ? (
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <Text className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide mb-2">Notas del cliente</Text>
                <Text className="text-[13px] text-gray-600 leading-relaxed italic">"{req.notes}"</Text>
              </View>
            ) : null}
          </View>

          {/* Botones */}
          <View className="gap-3">
            <TouchableOpacity
              onPress={onAccept}
              disabled={loading}
              className="w-full py-4 bg-[#E8432D] rounded-2xl items-center"
              style={{ opacity: loading ? 0.6 : 1 }}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text className="text-white font-extrabold text-[15px]">Aceptar Solicitud</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onReject}
              disabled={loading}
              className="w-full py-3 items-center"
              style={{ opacity: loading ? 0.4 : 1 }}
            >
              <Text className="text-gray-400 font-bold text-[14px]">Rechazar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WORKER HOME SCREEN
══════════════════════════════════════════════════════════════════ */
export default function WorkerHomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const { data: projects, loading: loadingProj, refetch: refetchProjects } = useProjects();

  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [ratingSummary, setRatingSummary] = useState({ avg: 0, count: 0 });
  const [hasNewRating, setHasNewRating] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'Profesional';
  const SEEN_KEY = `worker-seen-ratings-${user?.id}`;

  const activeProjects = (projects || []).filter(
    p => !['completado', 'cancelado'].includes(p.status)
  );

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get('/quotes/worker');
      setRequests((res.data.data || []).filter(q => q.status === 'solicitud_pendiente'));
    } catch {
      // sin red, continúa con lista vacía
    } finally {
      setLoadingReq(false);
    }
  }, []);

  const fetchRatings = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/ratings/worker/${user.id}`);
      const data = res.data.data || {};
      const count = data.worker?.rating_count ?? (data.ratings?.length || 0);
      const avg = data.worker?.rating_avg ?? 0;
      setRatingSummary({ avg, count });

      // Comparar con lo último visto para mostrar el aviso de "nueva"
      const seenRaw = await AsyncStorage.getItem(SEEN_KEY);
      const seen = seenRaw ? parseInt(seenRaw, 10) : 0;
      setHasNewRating(count > seen);
    } catch {
      // sin red, continúa
    }
  }, [user?.id, SEEN_KEY]);

  useEffect(() => { fetchRequests(); fetchRatings(); }, [fetchRequests, fetchRatings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRequests(), refetchProjects(), fetchRatings()]);
    setRefreshing(false);
  };

  const openRatings = async () => {
    // Marcar las calificaciones actuales como vistas
    await AsyncStorage.setItem(SEEN_KEY, String(ratingSummary.count));
    setHasNewRating(false);
    navigation.navigate('MyRatings');
  };

  const respondToRequest = async (quoteId, status) => {
    setResponding(true);
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status });
      Alert.alert(
        status === 'aceptada' ? '¡Trabajo aceptado! 🎉' : 'Solicitud rechazada',
        status === 'aceptada'
          ? 'El cliente será notificado. Ya puedes ver el proyecto en Mis Trabajos.'
          : 'Hemos notificado al cliente.'
      );
      setSelectedReq(null);
      await Promise.all([fetchRequests(), refetchProjects()]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo procesar la solicitud.');
    } finally {
      setResponding(false);
    }
  };

  const isLoading = loadingReq && loadingProj;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#E8432D" />
        <Text className="text-gray-400 text-[13px] mt-3 font-medium">Cargando tu panel...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9fb]">
      {/* ── Header ── */}
      <View className="bg-[#E8432D] pt-4 pb-16 px-5 relative overflow-hidden">
        <View className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <View className="absolute -right-2 top-12 w-20 h-20 bg-white/10 rounded-full" />

        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-[18px] bg-white/20 border-2 border-white/30 items-center justify-center">
            <Text className="text-white text-[20px] font-extrabold">
              {firstName[0]?.toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-white/80 text-[12px] font-medium">¡Hola,</Text>
            <Text className="text-white text-[18px] font-extrabold">{firstName} 👋</Text>
          </View>
          <View className="bg-white/20 px-3 py-1.5 rounded-full border border-white/20">
            <Text className="text-white text-[11px] font-extrabold uppercase tracking-wide">En línea</Text>
          </View>
        </View>

        <Text className="text-white/80 text-[13px] font-medium mt-3">
          {requests.length > 0
            ? `Tienes ${requests.length} solicitud${requests.length > 1 ? 'es' : ''} nueva${requests.length > 1 ? 's' : ''}`
            : 'Sin solicitudes nuevas por ahora'}
        </Text>
      </View>

      <ScrollView
        className="flex-1 -mt-10"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8432D" />}
      >
        {/* ── Solicitudes entrantes ── */}
        {requests.length > 0 ? (
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Zap size={16} color="#E8432D" />
              <Text className="text-[16px] font-extrabold text-[#111]">Solicitudes nuevas</Text>
              <View className="bg-[#E8432D] w-5 h-5 rounded-full items-center justify-center ml-1">
                <Text className="text-white text-[10px] font-extrabold">{requests.length}</Text>
              </View>
            </View>
            {requests.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                onView={() => setSelectedReq(req)}
                onReject={() => Alert.alert(
                  'Rechazar solicitud',
                  '¿Estás seguro? El cliente podrá elegir otro profesional.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Rechazar', style: 'destructive', onPress: () => respondToRequest(req.id, 'rechazada') },
                  ]
                )}
              />
            ))}
          </View>
        ) : (
          <View className="bg-white rounded-3xl p-8 items-center border border-gray-100 shadow-sm mb-6">
            <View className="w-16 h-16 bg-gray-50 rounded-full items-center justify-center mb-3">
              <Zap size={28} color="#d1d5db" />
            </View>
            <Text className="text-[15px] font-bold text-gray-400">Sin solicitudes nuevas</Text>
            <Text className="text-[13px] text-gray-300 text-center mt-1">
              Cuando un cliente te contacte, aparecerá aquí.
            </Text>
          </View>
        )}

        {/* ── Trabajos activos ── */}
        {activeProjects.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[16px] font-extrabold text-[#111]">Trabajos en curso</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProjectsTab', { screen: 'ProjectsTabScreen' })}>
                <Text className="text-[12px] text-[#E8432D] font-bold">Ver todos</Text>
              </TouchableOpacity>
            </View>
            {activeProjects.slice(0, 3).map(p => {
              const statusDef = STATUS_UI[p.status] || STATUS_UI.pendiente;
              const { Icon: StatusIcon } = statusDef;
              const tasks = p.tasks || [];
              const done = tasks.filter(t => t.status === 'completada').length;
              const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => navigation.navigate('ProjectsTab', { screen: 'ProjectDetail', params: { id: p.id } })}
                  className="bg-[#111] rounded-3xl p-5 mb-3 overflow-hidden relative"
                  activeOpacity={0.85}
                >
                  <View className="absolute -right-6 -top-6 w-24 h-24 rounded-full" style={{ backgroundColor: 'rgba(232,67,45,0.15)' }} />

                  {/* Badge estado */}
                  <View
                    className="self-start flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg mb-3"
                    style={{ backgroundColor: statusDef.bg }}
                  >
                    <StatusIcon size={11} color={statusDef.textColor} strokeWidth={2.5} />
                    <Text className="text-[10px] font-extrabold uppercase tracking-wide" style={{ color: statusDef.textColor }}>
                      {statusDef.label}
                    </Text>
                  </View>

                  <Text className="text-white text-[16px] font-extrabold mb-0.5" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text className="text-white/50 text-[12px] font-medium mb-4" numberOfLines={1}>
                    {p.client?.name || 'Cliente'} · {p.city || p.service?.name}
                  </Text>

                  {/* Progreso */}
                  {tasks.length > 0 && (
                    <View>
                      <View className="flex-row justify-between mb-1.5">
                        <Text className="text-white/50 text-[10px] font-bold uppercase">Progreso</Text>
                        <Text className="text-[#E8432D] text-[10px] font-extrabold">{pct}%</Text>
                      </View>
                      <View className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <View className="h-full bg-[#E8432D] rounded-full" style={{ width: `${pct}%` }} />
                      </View>
                    </View>
                  )}

                  <View className="flex-row items-center gap-1 mt-3">
                    <Text className="text-white/70 text-[12px] font-bold">Gestionar proyecto</Text>
                    <ChevronRight size={14} color="rgba(255,255,255,0.5)" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Mis calificaciones recientes ── */}
        <TouchableOpacity
          onPress={openRatings}
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex-row items-center gap-4 mb-4"
          activeOpacity={0.85}
        >
          <View className="w-12 h-12 rounded-2xl bg-amber-50 items-center justify-center relative">
            <Star size={22} color="#f59e0b" fill="#f59e0b" />
            {hasNewRating && (
              <View className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#E8432D] rounded-full border-2 border-white" />
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-bold text-[15px] text-[#111]">Mis calificaciones</Text>
              {hasNewRating && (
                <View className="bg-[#E8432D] px-2 py-0.5 rounded-full">
                  <Text className="text-white text-[9px] font-extrabold uppercase tracking-wide">Nueva</Text>
                </View>
              )}
            </View>
            {ratingSummary.count > 0 ? (
              <View className="flex-row items-center gap-1.5 mt-1">
                <Star size={12} color="#f59e0b" fill="#f59e0b" />
                <Text className="text-[13px] font-bold text-[#111]">
                  {Number(ratingSummary.avg).toFixed(1)}
                </Text>
                <Text className="text-[12px] text-gray-400">
                  · {ratingSummary.count} calificación{ratingSummary.count !== 1 ? 'es' : ''}
                </Text>
              </View>
            ) : (
              <Text className="text-[12px] text-gray-400 mt-0.5">Ver lo que dicen tus clientes</Text>
            )}
          </View>
          <ChevronRight size={18} color="#d1d5db" />
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de detalle de solicitud */}
      <RequestModal
        req={selectedReq}
        loading={responding}
        onClose={() => !responding && setSelectedReq(null)}
        onAccept={() => respondToRequest(selectedReq.id, 'aceptada')}
        onReject={() => {
          setSelectedReq(null);
          Alert.alert(
            'Rechazar solicitud',
            '¿Estás seguro?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Rechazar', style: 'destructive', onPress: () => respondToRequest(selectedReq.id, 'rechazada') },
            ]
          );
        }}
      />
    </SafeAreaView>
  );
}
