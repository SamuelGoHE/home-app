import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Briefcase, Star, MapPin, User } from 'lucide-react-native';
import {
  getFavoriteServices, toggleFavoriteService,
  getFavoriteWorkers, toggleFavoriteWorker,
} from '../utils/favorites';

/* ─── Imágenes por categoría ─────────────────────────────────────── */
const SERVICE_IMAGES = {
  pintura: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=300&fit=crop',
  enchapes: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop',
  electricidad: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=400&h=300&fit=crop',
  plomeria: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=300&fit=crop',
  obra_gris: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400&h=300&fit=crop',
  carpinteria: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=300&fit=crop',
  impermeabilizacion: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=400&h=300&fit=crop',
  otro: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=300&fit=crop',
};
const getServiceImg = (svc) =>
  svc?.image_url || SERVICE_IMAGES[svc?.category] || SERVICE_IMAGES.otro;

/* ─── Componente de tab ──────────────────────────────────────────── */
function Tab({ label, icon: Icon, count, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center gap-2 px-4 py-2 rounded-xl mr-2
        ${active ? 'bg-[#E8432D]' : 'bg-gray-100'}`}
    >
      <Icon size={14} color={active ? '#fff' : '#6b7280'} />
      <Text className={`text-[13px] font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
        {label}
      </Text>
      {count > 0 && (
        <View className={`px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-gray-200'}`}>
          <Text className={`text-[11px] font-extrabold ${active ? 'text-white' : 'text-gray-600'}`}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ─── Estado vacío ──────────────────────────────────────────────── */
function EmptyState({ icon: Icon, title, subtitle, cta, onCta }) {
  return (
    <View className="bg-white rounded-3xl p-10 items-center border border-gray-100 shadow-sm mt-4 mx-5">
      <View className="w-14 h-14 bg-red-50 rounded-2xl items-center justify-center mb-4">
        <Icon size={24} color="#E8432D" />
      </View>
      <Text className="font-bold text-gray-400 text-[15px]">{title}</Text>
      <Text className="text-gray-300 text-[13px] mt-1 text-center">{subtitle}</Text>
      {cta && (
        <TouchableOpacity
          onPress={onCta}
          className="mt-4 px-5 py-2.5 bg-[#E8432D] rounded-xl"
        >
          <Text className="text-white text-[13px] font-bold">{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
export default function FavoritesScreen({ navigation }) {
  const [tab, setTab] = useState('services');
  const [services, setServices] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const [svcs, wrks] = await Promise.all([
        getFavoriteServices(),
        getFavoriteWorkers(),
      ]);
      setServices(svcs);
      setWorkers(wrks);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadFavorites(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const removeService = async (svc) => {
    const { favorites } = await toggleFavoriteService(svc);
    setServices(favorites);
  };

  const removeWorker = async (w) => {
    const { favorites } = await toggleFavoriteWorker(w);
    setWorkers(favorites);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9fb]">
      {/* Header + Tabs */}
      <View className="bg-white px-5 pt-4 pb-4 border-b border-gray-100">
        <Text className="text-[20px] font-extrabold text-[#111] mb-4">Favoritos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Tab
            label="Trabajos"
            icon={Briefcase}
            count={services.length}
            active={tab === 'services'}
            onPress={() => setTab('services')}
          />
          <Tab
            label="Trabajadores"
            icon={User}
            count={workers.length}
            active={tab === 'workers'}
            onPress={() => setTab('workers')}
          />
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E8432D" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8432D" />}
        >
          {/* ── Tab: Servicios ── */}
          {tab === 'services' && (
            <>
              {services.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Sin trabajos favoritos"
                  subtitle="Guarda servicios para acceder rápido."
                  cta="Explorar servicios"
                  onCta={() => navigation.navigate('ServicesTab')}
                />
              ) : (
                <View className="px-5 gap-3">
                  {services.map((svc) => (
                    <TouchableOpacity
                      key={svc.id}
                      onPress={() => navigation.navigate('Quote', {
                        serviceId: svc.id,
                        serviceName: svc.name,
                        serviceCategory: svc.category || '',
                      })}
                      className="bg-white rounded-2xl p-3 flex-row items-center gap-3 shadow-sm border border-gray-100"
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: getServiceImg(svc) }}
                        className="w-16 h-16 rounded-xl"
                        resizeMode="cover"
                      />
                      <View className="flex-1 min-w-0">
                        <Text className="font-bold text-[15px] text-[#111]" numberOfLines={1}>
                          {svc.name}
                        </Text>
                        {svc.category && (
                          <Text className="text-[12px] text-gray-400 capitalize mt-0.5">
                            {svc.category.replace('_', ' ')}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => removeService(svc)}
                        className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Heart size={16} color="#E8432D" fill="#E8432D" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ── Tab: Trabajadores ── */}
          {tab === 'workers' && (
            <>
              {workers.length === 0 ? (
                <EmptyState
                  icon={User}
                  title="Sin trabajadores favoritos"
                  subtitle={'Cuando veas un trabajador que te guste,\nguárdalo con el corazón ♡.'}
                />
              ) : (
                <View className="px-5 gap-3">
                  {workers.map((w) => (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => navigation.navigate('WorkerDetail', { workerId: w.id })}
                      className="bg-white rounded-2xl p-3 flex-row items-center gap-3 shadow-sm border border-gray-100"
                      activeOpacity={0.85}
                    >
                      {/* Avatar */}
                      <View className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {w.avatar ? (
                          <Image
                            source={{ uri: w.avatar }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <Text className="text-2xl font-extrabold text-gray-300">
                              {w.name?.[0]?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Info */}
                      <View className="flex-1 min-w-0">
                        <Text className="font-bold text-[15px] text-[#111]" numberOfLines={1}>
                          {w.name}
                        </Text>
                        {w.city && (
                          <View className="flex-row items-center gap-1 mt-0.5">
                            <MapPin size={11} color="#9ca3af" />
                            <Text className="text-[12px] text-gray-400">{w.city}</Text>
                          </View>
                        )}
                        {w.rating_avg && (
                          <View className="flex-row items-center gap-1 mt-0.5">
                            <Star size={11} color="#E8432D" fill="#E8432D" />
                            <Text className="text-[12px] font-bold text-[#111]">{w.rating_avg}</Text>
                            <Text className="text-[11px] text-gray-400">({w.rating_count ?? 0})</Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={() => removeWorker(w)}
                        className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Heart size={16} color="#E8432D" fill="#E8432D" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}