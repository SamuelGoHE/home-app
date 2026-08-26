import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, RefreshControl, TextInput, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Briefcase, MapPin, Calendar, FileText, X,
  ChevronRight, Zap, Star,
  DollarSign,
} from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import { useProjects } from '../hooks/useApi';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, IconButton, Card, StatusBadge, Input, LoadingState, EmptyState, ErrorState } from '../components/ui';

/* ─── Helper: cómo se muestra el precio fijo de una solicitud ─── */
const formatPrice = (req) => {
  if (req.estimated_price == null) return '—';
  const amount = `$${Number(req.estimated_price).toLocaleString('es-CO')}`;
  return req.pricing_type === 'por_dia' ? `${amount}/día` : amount;
};

/**
 * Colores literales necesarios para props `color`/`iconColor` de
 * lucide-react-native (los íconos SVG no aceptan clases de Tailwind).
 * Cada uno coincide exactamente con el token homónimo de
 * design-system/tokens.js.
 */
const ICON = {
  muted: '#6b7280',   // = tokens.colors.muted
  brand: '#E8432D',   // = tokens.colors.brand.DEFAULT
  surface: '#ffffff', // = tokens.colors.surface.DEFAULT
  disabled: '#d1d5db',
};

// Acento de calificación — deliberadamente fuera del mapa de status.js
// (mismo criterio ya documentado en Projectdetailscreen.js/WorkerProfileScreen).
const RATING_COLOR = '#f59e0b';

/**
 * Colores decorativos de las filas de la ficha de solicitud (Servicio /
 * Cliente / Ciudad / Dirección / Fecha) — cada campo tiene su propio acento
 * puramente visual, sin significado semántico de estado. Ninguno coincide
 * con un token existente, así que se preservan tal cual (decisión: la
 * decoración no se convierte automáticamente en estado semántico).
 */
const FIELD_ACCENT = {
  servicio: { color: '#3b82f6', bg: '#eff6ff' },
  cliente: { color: '#6366f1', bg: '#eef2ff' },
  ciudad: { color: '#10b981', bg: '#ecfdf5' },
  direccion: { color: '#f97316', bg: '#fff7ed' },
  fecha: { color: '#8b5cf6', bg: '#f5f3ff' },
};

/* ─── Tarjeta de solicitud entrante ──────────────────────────────── */
function RequestCard({ req, onView, onReject }) {
  return (
    <Card className="mb-4">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 min-w-0 mr-3">
          <Text className="font-extrabold text-[16px] text-ink" numberOfLines={1}>
            {req.service?.name || 'Servicio'}
          </Text>
          <Text className="text-[12px] text-muted font-medium mt-0.5">
            {req.client?.name}
          </Text>
        </View>
        <View className="items-end">
          <View className="bg-brand/10 px-3 py-1 rounded-full mb-1.5">
            <Text className="text-brand text-[11px] font-extrabold">Nueva</Text>
          </View>
          <Text className="text-[13px] font-extrabold text-ink">{formatPrice(req)}</Text>
        </View>
      </View>

      {/* Info del trabajo */}
      <View className="gap-2 mb-4">
        {req.city ? (
          <View className="flex-row items-center gap-2">
            <MapPin size={13} color={ICON.muted} />
            <Text className="text-[13px] text-muted">{req.address ? `${req.address}, ` : ''}{req.city}</Text>
          </View>
        ) : null}
        {req.start_date ? (
          <View className="flex-row items-center gap-2">
            <Calendar size={13} color={ICON.muted} />
            <Text className="text-[13px] text-muted">
              {new Date(req.start_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        ) : null}
        {req.notes ? (
          <View className="flex-row items-start gap-2">
            <FileText size={13} color={ICON.muted} style={{ marginTop: 2 }} />
            <Text className="flex-1 text-[13px] text-muted leading-relaxed" numberOfLines={2}>
              {req.notes}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Acciones */}
      <View className="flex-row gap-3">
        <Button variant="primary" className="flex-1" onPress={onView}>
          Ver detalles
        </Button>
        <Button variant="secondary" className="flex-1" onPress={onReject}>
          Rechazar
        </Button>
      </View>
    </Card>
  );
}

/* ─── Modal de detalle de solicitud ──────────────────────────────── */
function RequestModal({ req, loading, onClose, onAccept, onReject }) {
  const [finalPrice, setFinalPrice] = useState('');

  if (!req) return null;

  const needsPrice = req.pricing_type === 'por_contrato' && req.estimated_price == null;
  const canAccept = !needsPrice || (finalPrice && Number(finalPrice) > 0);

  const rows = [
    { label: 'Servicio', value: req.service?.name, accent: FIELD_ACCENT.servicio },
    { label: 'Cliente', value: req.client?.name, accent: FIELD_ACCENT.cliente },
    { label: 'Ciudad', value: req.city, accent: FIELD_ACCENT.ciudad },
    { label: 'Dirección', value: req.address, accent: FIELD_ACCENT.direccion },
    {
      label: 'Fecha inicio',
      value: req.start_date
        ? new Date(req.start_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
        : null,
      accent: FIELD_ACCENT.fecha,
    },
  ].filter(r => r.value);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity className="flex-1" onPress={onClose} />
        {/* rounded-t-[40px]: convención ya vista en los modales de rol-trabajador
            (mismo radio en WorkerDashboard.jsx, web) — se preserva tal cual. */}
        <View className="bg-surface rounded-t-[40px] p-6 pb-10">
          {/* Encabezado */}
          <View className="flex-row items-start justify-between mb-5">
            <View className="w-14 h-14 rounded-3xl bg-orange-50 items-center justify-center">
              <Briefcase size={26} color={ICON.brand} />
            </View>
            <IconButton
              icon={X}
              variant="solid"
              accessibilityLabel="Cerrar"
              onPress={onClose}
            />
          </View>

          <Text className="text-[22px] font-extrabold text-ink mb-1">Detalles de Solicitud</Text>
          <Text className="text-[13px] text-muted mb-6">
            Revisa los requerimientos antes de aceptar
          </Text>

          <View className="gap-4 mb-7">
            {rows.map(row => (
              <View key={row.label} className="flex-row items-start gap-4">
                <View className="w-10 h-10 rounded-2xl items-center justify-center flex-shrink-0" style={{ backgroundColor: row.accent.bg }}>
                  <Briefcase size={16} color={row.accent.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-extrabold text-muted uppercase tracking-wide">{row.label}</Text>
                  <Text className="text-[14px] font-bold text-ink mt-0.5">{row.value}</Text>
                </View>
              </View>
            ))}
            {req.notes ? (
              <View className="bg-gray-50 rounded-2xl p-4 border border-border">
                <Text className="text-[10px] font-extrabold text-muted uppercase tracking-wide mb-2">Notas del cliente</Text>
                <Text className="text-[13px] text-gray-600 leading-relaxed italic">"{req.notes}"</Text>
              </View>
            ) : null}

            {/* Precio de la solicitud */}
            <View className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
              <View className="flex-row items-center gap-1.5 mb-2">
                <DollarSign size={12} color="#fb923c" />
                <Text className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wide">
                  {needsPrice ? 'Define el precio final' : 'Tu tarifa fija'}
                </Text>
              </View>
              {needsPrice ? (
                <>
                  <Text className="text-[12px] text-muted mb-3">
                    Este es un trabajo por contrato: indica el monto que le vas a cobrar a este cliente antes de aceptar.
                  </Text>
                  <Input
                    value={finalPrice}
                    onChangeText={setFinalPrice}
                    keyboardType="numeric"
                    placeholder="Monto $"
                    className="!bg-surface !border-orange-100 text-[16px] font-black"
                  />
                </>
              ) : (
                <Text className="text-[22px] font-black text-ink">{formatPrice(req)}</Text>
              )}
            </View>
          </View>

          {/* Botones */}
          <View className="gap-3 mt-6">
            <Button
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!canAccept}
              onPress={() => onAccept(needsPrice ? Number(finalPrice) : undefined)}
            >
              Aceptar Solicitud
            </Button>
            <Button
              variant="ghost"
              fullWidth
              disabled={loading}
              onPress={onReject}
            >
              Rechazar
            </Button>
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
  const [reqError, setReqError] = useState(null);
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
      setReqError(null);
    } catch (err) {
      setReqError(err.response?.data?.message || 'No se pudieron cargar las solicitudes');
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

  const respondToRequest = async (quoteId, status, estimatedPrice) => {
    setResponding(true);
    try {
      await api.patch(`/quotes/${quoteId}/status`, { status, estimatedPrice });
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
      <View className="flex-1 items-center justify-center bg-surface">
        <LoadingState message="Cargando tu panel..." />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* ── Header ── */}
      <View className="bg-brand pt-4 pb-16 px-5 relative overflow-hidden">
        <View className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <View className="absolute -right-2 top-12 w-20 h-20 bg-white/10 rounded-full" />

        <View className="flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-[18px] bg-white/20 border-2 border-white/30 items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-white text-[20px] font-extrabold">
                {firstName[0]?.toUpperCase()}
              </Text>
            )}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ICON.brand} />}
      >
        {/* ── Solicitudes entrantes ── */}
        {requests.length > 0 ? (
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Zap size={16} color={ICON.brand} />
              <Text className="text-[16px] font-extrabold text-ink">Solicitudes nuevas</Text>
              <View className="bg-brand w-5 h-5 rounded-full items-center justify-center ml-1">
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
          <View className="mb-6">
            {reqError ? (
              <ErrorState message={reqError} onRetry={fetchRequests} />
            ) : (
              <EmptyState
                icon={<Zap size={28} color={ICON.disabled} />}
                title="Sin solicitudes nuevas"
                subtitle="Cuando un cliente te contacte, aparecerá aquí."
              />
            )}
          </View>
        )}

        {/* ── Trabajos activos ── */}
        {activeProjects.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[16px] font-extrabold text-ink">Trabajos en curso</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProjectsTab', { screen: 'ProjectsTabScreen' })}>
                <Text className="text-[12px] text-brand font-bold">Ver todos</Text>
              </TouchableOpacity>
            </View>
            {activeProjects.slice(0, 3).map(p => {
              const tasks = p.tasks || [];
              const done = tasks.filter(t => t.status === 'completada').length;
              const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => navigation.navigate('ProjectsTab', { screen: 'ProjectDetail', params: { id: p.id } })}
                  className="bg-ink rounded-3xl p-5 mb-3 overflow-hidden relative"
                  activeOpacity={0.85}
                >
                  <View className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-brand/15" />

                  {/* Badge estado — mapa canónico, no local */}
                  <View className="mb-3">
                    <StatusBadge status={p.status} />
                  </View>

                  <Text className="text-white text-[16px] font-extrabold mb-0.5" numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text className="text-white/50 text-[12px] font-medium mb-4" numberOfLines={1}>
                    {p.client?.name || 'Cliente'} · {p.city || p.service?.name}
                  </Text>

                  {/* Progreso — patrón canónico: brand en curso, success al completar */}
                  {tasks.length > 0 && (
                    <View>
                      <View className="flex-row justify-between mb-1.5">
                        <Text className="text-white/50 text-[10px] font-bold uppercase">Progreso</Text>
                        <Text className="text-brand text-[10px] font-extrabold">{pct}%</Text>
                      </View>
                      <View className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <View
                          className={`h-full rounded-full ${pct >= 100 ? 'bg-success' : 'bg-brand'}`}
                          style={{ width: `${pct}%` }}
                        />
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
        <Card
          onPress={openRatings}
          accessibilityLabel="Ver mis calificaciones"
          className="flex-row items-center gap-4 mb-4"
        >
          <View className="w-12 h-12 rounded-2xl bg-amber-50 items-center justify-center relative">
            <Star size={22} color={RATING_COLOR} fill={RATING_COLOR} />
            {hasNewRating && (
              <View className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand rounded-full border-2 border-surface" />
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-bold text-[15px] text-ink">Mis calificaciones</Text>
              {hasNewRating && (
                <View className="bg-brand/10 px-2 py-0.5 rounded-full">
                  <Text className="text-brand text-[9px] font-extrabold uppercase tracking-wide">Nueva</Text>
                </View>
              )}
            </View>
            {ratingSummary.count > 0 ? (
              <View className="flex-row items-center gap-1.5 mt-1">
                <Star size={12} color={RATING_COLOR} fill={RATING_COLOR} />
                <Text className="text-[13px] font-bold text-ink">
                  {Number(ratingSummary.avg).toFixed(1)}
                </Text>
                <Text className="text-[12px] text-muted">
                  · {ratingSummary.count} calificación{ratingSummary.count !== 1 ? 'es' : ''}
                </Text>
              </View>
            ) : (
              <Text className="text-[12px] text-muted mt-0.5">Ver lo que dicen tus clientes</Text>
            )}
          </View>
          <ChevronRight size={18} color={ICON.disabled} />
        </Card>
      </ScrollView>

      {/* Modal de detalle de solicitud */}
      <RequestModal
        req={selectedReq}
        loading={responding}
        onClose={() => !responding && setSelectedReq(null)}
        onAccept={(price) => respondToRequest(selectedReq.id, 'aceptada', price)}
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
