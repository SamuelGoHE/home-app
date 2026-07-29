import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Zap, X } from 'lucide-react-native';
import { useServices } from '../hooks/useApi';

const CATEGORY_META = {
  pintura:            { img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&h=400&fit=crop',   label: 'Pintura' },
  enchapes:           { img: 'https://images.unsplash.com/photo-1521783593447-5702b9bfd267?w=600&h=400&fit=crop', label: 'Enchapes' },
  electricidad:       { img: 'https://images.unsplash.com/photo-1558227691-41ea78d1f631?w=600&h=400&fit=crop',   label: 'Electricidad' },
  plomeria:           { img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=400&fit=crop', label: 'Plomería' },
  obra_gris:          { img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&h=400&fit=crop',   label: 'Obra gris' },
  carpinteria:        { img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop', label: 'Carpintería' },
  impermeabilizacion: { img: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&h=400&fit=crop', label: 'Impermeabilización' },
  otro:               { img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop', label: 'Otro' },
};

const getServiceImage = (svc) =>
  svc?.image_url || CATEGORY_META[svc?.category]?.img || CATEGORY_META.otro.img;

export default function ServicesScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(route?.params?.filterCategory || null);
  const { data: services, loading } = useServices();

  // Sincroniza el filtro cuando llega una categoría desde el Home (aunque la
  // pantalla ya estuviera montada). El _ts asegura que re-seleccionar la misma
  // categoría vuelva a aplicar el filtro.
  useEffect(() => {
    if (route.params?.filterCategory !== undefined) {
      setActiveCategory(route.params.filterCategory);
    }
  }, [route.params?.filterCategory, route.params?._ts]);

  const categories = useMemo(() => {
    if (!services) return [];
    return [...new Map(services.map(s => [s.category, s])).values()];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter(s => {
      const matchSearch =
        !search.trim() ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !activeCategory || s.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [services, search, activeCategory]);

  const renderServiceCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Quote', { serviceId: item.id, serviceName: item.name, serviceCategory: item.category })}
      className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm mb-4"
      activeOpacity={0.85}
    >
      <Image source={{ uri: getServiceImage(item) }} className="w-full h-36" resizeMode="cover" />
      <View className="p-4">
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Zap size={14} color="#E8432D" />
          <Text className="text-[11px] font-bold text-[#E8432D] uppercase tracking-wider">
            {CATEGORY_META[item.category]?.label || item.category.replace('_', ' ')}
          </Text>
        </View>
        <Text className="text-[16px] font-bold text-[#111] mb-1">{item.name}</Text>
        {item.description ? (
          <Text className="text-[13px] text-gray-500 mb-3" numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View className="flex-row items-center justify-end">
          <View className="bg-[#E8432D] px-4 py-2 rounded-xl">
            <Text className="text-white font-bold text-[13px]">Cotizar</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* ── Header & Search ── */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-gray-50 z-10">
        <Text className="text-[24px] font-extrabold text-[#111] mb-4">Servicios</Text>

        {/* Barra de búsqueda */}
        <View className="flex-row items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-3">
          <Search size={18} color="#9ca3af" />
          <TextInput
            placeholder="¿Qué servicio buscas hoy?"
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

        {/* ── Chips de categoría ── */}
        {!loading && categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-1">
            {/* Chip "Todos" */}
            <TouchableOpacity
              onPress={() => setActiveCategory(null)}
              activeOpacity={0.85}
              className="mr-2 px-4 py-2 rounded-2xl border"
              style={{
                backgroundColor: !activeCategory ? '#E8432D' : '#ffffff',
                borderColor:     !activeCategory ? '#E8432D' : '#e5e7eb',
              }}
            >
              <Text className="text-[13px] font-bold" style={{ color: !activeCategory ? '#ffffff' : '#6b7280' }}>
                Todos
              </Text>
            </TouchableOpacity>
            {categories.map(cat => {
              const active = activeCategory === cat.category;
              return (
                <TouchableOpacity
                  key={cat.category}
                  onPress={() => setActiveCategory(active ? null : cat.category)}
                  activeOpacity={0.85}
                  className="mr-2 px-4 py-2 rounded-2xl border"
                  style={{
                    backgroundColor: active ? '#E8432D' : '#ffffff',
                    borderColor:     active ? '#E8432D' : '#e5e7eb',
                  }}
                >
                  <Text className="text-[13px] font-bold" style={{ color: active ? '#ffffff' : '#6b7280' }}>
                    {CATEGORY_META[cat.category]?.label || cat.category.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Lista ── */}
      <View className="flex-1 bg-gray-50/50">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#E8432D" />
          </View>
        ) : (
          <FlatList
            data={filteredServices}
            keyExtractor={item => item.id?.toString()}
            renderItem={renderServiceCard}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="py-10 items-center gap-2">
                <Text className="text-4xl">🔍</Text>
                <Text className="text-[15px] font-bold text-gray-400">Sin resultados</Text>
                <Text className="text-[13px] text-gray-300 text-center px-6">
                  {search
                    ? `No encontramos servicios con "${search}"`
                    : 'No hay servicios en esta categoría'}
                </Text>
                {(search || activeCategory) && (
                  <TouchableOpacity
                    onPress={() => { setSearch(''); setActiveCategory(null); }}
                    className="mt-2 px-5 py-2.5 bg-[#E8432D] rounded-xl"
                  >
                    <Text className="text-white font-bold text-[13px]">Limpiar filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
