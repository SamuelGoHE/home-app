import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, MapPin, Star,
  SlidersHorizontal, AlertCircle, X,
} from 'lucide-react-native';
import { useWorkers } from '../hooks/useApi';

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

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-3xl p-4 flex-row gap-4 shadow-sm border border-gray-100 mb-4"
      activeOpacity={0.85}
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
            <Text className="font-extrabold text-[17px] text-[#111]">
              {worker.name?.split(' ')[0]}
            </Text>
            {profile.is_verified && (
              <View className="bg-emerald-50 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-semibold text-emerald-700">Verificado</Text>
              </View>
            )}
          </View>

          {/* Ciudad */}
          <View className="flex-row items-center gap-1 mt-0.5">
            <MapPin size={12} color="#9ca3af" />
            <Text className="text-[12px] text-gray-400" numberOfLines={1}>
              {profile.cities_covered?.[0] || 'Varias ciudades'}
            </Text>
          </View>
        </View>

        {/* Rating - Solo mostrar si hay datos */}
        {Number(worker.rating_count) > 0 && (
          <View className="flex-row items-center gap-1 mt-2">
            <Star size={13} color="#E8432D" fill="#E8432D" />
            <Text className="text-[13px] font-bold text-[#111]">
              {worker.rating_avg ? parseFloat(worker.rating_avg).toFixed(1) : '--'}
            </Text>
            <Text className="text-[12px] text-gray-400">
              ({worker.rating_count ?? 0})
            </Text>
          </View>
        )}
      </View>

    </TouchableOpacity>
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

  const { data: workers, loading } = useWorkers(filterCity, serviceCategory);

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
    <View className="bg-white rounded-3xl p-10 items-center border border-gray-100 shadow-sm mt-2">
      <View className="w-16 h-16 bg-red-50 rounded-full items-center justify-center mb-4">
        <AlertCircle size={24} color="#E8432D" />
      </View>
      <Text className="text-[16px] font-extrabold text-[#111] mb-1">Sin resultados</Text>
      <Text className="text-[13px] text-gray-500 text-center">
        No encontramos trabajadores disponibles en{' '}
        <Text className="font-bold">{filterCity || 'tu área'}</Text> en este momento.
      </Text>
    </View>
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
      <View className="bg-white px-5 pt-4 pb-4 flex-row items-center gap-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 items-center justify-center rounded-xl bg-gray-100"
        >
          <ArrowLeft size={18} color="#4b5563" />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="font-bold text-[17px] text-[#111]">Trabajadores disponibles</Text>
          {serviceName && serviceName !== 'Servicio' && (
            <Text className="text-[12px] text-gray-400" numberOfLines={1}>{serviceName}</Text>
          )}
        </View>

        {/* Filtro */}
        <TouchableOpacity
          onPress={() => setShowFilter(true)}
          className="w-9 h-9 items-center justify-center rounded-xl bg-gray-100 relative"
        >
          <SlidersHorizontal size={17} color="#4b5563" />
          {filterCity ? (
            <View className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8432D] rounded-full border border-white" />
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E8432D" />
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
          <TouchableOpacity className="flex-1" onPress={() => setShowFilter(false)} />
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-extrabold text-[#111]">Filtrar por Ciudad</Text>
              <TouchableOpacity
                onPress={() => setShowFilter(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-gray-100"
              >
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {CITIES.map((opt) => {
              const active = filterCity === opt.value;
              return (
                <TouchableOpacity
                  key={opt.label}
                  onPress={() => handleSelectCity(opt.value)}
                  className={`py-3.5 px-4 rounded-2xl mb-2 ${active ? 'bg-[#E8432D]' : 'bg-gray-50'}`}
                  activeOpacity={0.8}
                >
                  <Text className={`text-[15px] font-bold ${active ? 'text-white' : 'text-gray-700'}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}