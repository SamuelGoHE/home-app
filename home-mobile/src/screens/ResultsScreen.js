import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin, Star,
  SlidersHorizontal, AlertCircle, X,
} from 'lucide-react-native';
import { useWorkers } from '../hooks/useApi';
import { Button, IconButton, BackButton, Card, Badge, ErrorState } from '../components/ui';

/**
 * Colores literales necesarios para props `color` de lucide-react-native
 * (los íconos SVG no aceptan clases de Tailwind). Cada uno coincide
 * exactamente con el token homónimo de design-system/tokens.js.
 */
const ICON = {
  muted: '#6b7280',
  brand: '#E8432D',
};

const CITIES = [
  { value: '', label: 'Todas las ciudades' },
  { value: 'Medellín', label: 'Medellín' },
  { value: 'Bogotá', label: 'Bogotá' },
  { value: 'Cali', label: 'Cali' },
  { value: 'Pereira', label: 'Pereira' },
];

const AVATAR_FALLBACK =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop';

/* ══════════════════════════════════════════════════════════════════
   WORKER CARD
══════════════════════════════════════════════════════════════════ */
function WorkerCard({ worker, onPress }) {
  const profile = worker.workerProfile || {};
  const rate = worker.serviceRates?.[0];
  const rateText = !rate || rate.price_unit === 'a_convenir'
    ? 'Cotiza tras revisar'
    : `$${Number(rate.amount).toLocaleString('es-CO')} / ${rate.price_unit.replace('por_', 'por ')}`;

  return (
    <Card
      padding="sm"
      onPress={onPress}
      accessibilityLabel={`Ver perfil de ${worker.name}`}
      className="flex-row gap-4 mb-4"
    >
      {/* Avatar */}
      <View className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
        <Image
          source={{ uri: worker.avatar || AVATAR_FALLBACK }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* Info */}
      <View className="flex-1 justify-between min-w-0">
        <View>
          {/* Nombre + badge */}
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text className="font-extrabold text-[17px] text-ink">
              {worker.name?.split(' ')[0]}
            </Text>
            {profile.is_verified && <Badge tone="success">Verificado</Badge>}
          </View>

          {/* Ciudad */}
          <View className="flex-row items-center gap-1 mt-0.5">
            <MapPin size={12} color={ICON.muted} />
            <Text className="text-[12px] text-muted" numberOfLines={1}>
              {profile.cities_covered?.[0] || 'Varias ciudades'}
            </Text>
          </View>
        </View>

        {/* Rating - Solo mostrar si hay datos */}
        {Number(worker.rating_count) > 0 && (
          <View className="flex-row items-center gap-1 mt-2">
            <Star size={13} color={ICON.brand} fill={ICON.brand} />
            <Text className="text-[13px] font-bold text-ink">
              {worker.rating_avg ? parseFloat(worker.rating_avg).toFixed(1) : '--'}
            </Text>
            <Text className="text-[12px] text-muted">
              ({worker.rating_count ?? 0})
            </Text>
          </View>
        )}
        <Text className="text-[12px] font-extrabold text-brand mt-2">
          {rateText}{rate?.includes_materials ? ' · Incluye materiales' : ''}
        </Text>
      </View>

    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
export default function ResultsScreen({ route, navigation }) {
  const {
    serviceId = '',
    serviceName = 'Servicio',
    serviceCategory = '',
    city: initCity = '',
    address = '',
    sq_meters = '',
    occupied = '',
    notes = '',
  } = route.params || {};

  const [filterCity, setFilterCity] = useState(initCity);
  const [showFilter, setShowFilter] = useState(false);

  const { data: workers, loading, error, refetch } = useWorkers(filterCity, serviceCategory);

  const handleSelectCity = (city) => {
    setFilterCity(city);
    setShowFilter(false);
  };

  const handleWorkerPress = (worker) => {
    navigation.navigate('WorkerDetail', {
      workerId: worker.id,
      // Pasamos el contexto de la cotización para que WorkerDetail pueda continuar el flujo
      serviceId,
      serviceName,
      serviceCategory,
      city: filterCity,
      address,
      sq_meters,
      occupied,
      notes,
    });
  };

  /* ── Render item ── */
  const renderItem = ({ item }) => (
    <WorkerCard
      worker={item}
      onPress={() => handleWorkerPress(item)}
    />
  );

  /* ── Empty / error states ── */
  const ListEmpty = () => (
    <Card padding="lg" className="items-center mt-2">
      <View className="w-16 h-16 bg-brand-soft rounded-full items-center justify-center mb-4">
        <AlertCircle size={24} color={ICON.brand} />
      </View>
      <Text className="text-[16px] font-extrabold text-ink mb-1">Sin resultados</Text>
      <Text className="text-[13px] text-gray-500 text-center">
        No encontramos trabajadores disponibles en{' '}
        <Text className="font-bold">{filterCity || 'tu área'}</Text> en este momento.
      </Text>
    </Card>
  );

  const ListHeader = () => (
    <Text className="text-sm text-gray-500 font-medium mb-3">
      {loading
        ? 'Buscando trabajadores...'
        : `${workers?.length || 0} trabajadores disponibles${filterCity ? ` en ${filterCity}` : ''}`}
    </Text>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-surface px-5 pt-4 pb-4 flex-row items-center gap-3 border-b border-border">
        <BackButton onPress={() => navigation.goBack()} />

        <View className="flex-1">
          <Text className="font-bold text-[17px] text-ink">Trabajadores disponibles</Text>
          {serviceName && serviceName !== 'Servicio' && (
            <Text className="text-[12px] text-muted" numberOfLines={1}>{serviceName}</Text>
          )}
        </View>

        {/* Filtro */}
        <View className="relative">
          <IconButton
            icon={SlidersHorizontal}
            accessibilityLabel="Filtrar por ciudad"
            onPress={() => setShowFilter(true)}
          />
          {filterCity ? (
            <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full border border-white pointer-events-none" />
          ) : null}
        </View>
      </View>

      {/* Lista */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ICON.brand} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <ErrorState message={error} onRetry={refetch} />
        </View>
      ) : (
        <FlatList
          data={workers || []}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderItem}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<ListEmpty />}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal filtro por ciudad */}
      <Modal visible={showFilter} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity className="flex-1" onPress={() => setShowFilter(false)} accessibilityRole="button" accessibilityLabel="Cerrar" />
          <View className="bg-surface rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-extrabold text-ink">Filtrar por Ciudad</Text>
              <IconButton icon={X} variant="solid" accessibilityLabel="Cerrar" className="!bg-gray-100 !border-0" onPress={() => setShowFilter(false)} />
            </View>

            {CITIES.map((opt) => {
              const active = filterCity === opt.value;
              return (
                <Button
                  key={opt.label}
                  variant={active ? 'primary' : 'secondary'}
                  className={`!justify-start !rounded-2xl mb-2 ${active ? '' : '!border-0 !bg-gray-50'}`}
                  onPress={() => handleSelectCity(opt.value)}
                >
                  {opt.label}
                </Button>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
