import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Pressable, Image, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Zap, X } from 'lucide-react-native';
import { useServices } from '../hooks/useApi';
import { Button, Card, ErrorState } from '../components/ui';

/**
 * Colores literales necesarios para props `color`/`style.color` de
 * lucide-react-native y RN puro (no aceptan clases de Tailwind). `brand`,
 * `surface`, `border` y `muted` coinciden exactamente con sus tokens
 * homónimos de design-system/tokens.js. `gray400` (#9ca3af) no tiene
 * equivalente semántico en el design system (es distinto de `muted`
 * #6b7280) — se deja nombrado tal cual, sin fingir una equivalencia que no
 * existe.
 */
const ICON = {
  brand: '#E8432D',
  surface: '#ffffff',
  border: '#e5e7eb',
  muted: '#6b7280',
  gray400: '#9ca3af',
};

const CATEGORY_META = {
  pintura:            { img: require('../../assets/pintura_interior.jpg'), label: 'Pintura' },
  enchapes:           { img: require('../../assets/enchapes.jpg'),         label: 'Enchapes' },
  electricidad:       { img: require('../../assets/electricidad.jpg'),     label: 'Electricidad' },
  plomeria:           { img: require('../../assets/plomeria.jpg'),         label: 'Plomería' },
  obra_gris:          { img: require('../../assets/obra_gris.jpg'),        label: 'Obra gris' },
  carpinteria:        { img: { uri: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=400&fit=crop' }, label: 'Carpintería' },
  impermeabilizacion: { img: require('../../assets/impermeabilizacion.jpg'), label: 'Impermeabilización' },
  otro:               { img: { uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=400&fit=crop' }, label: 'Otro' },
};

const getServiceImage = (svc) => {
  if (svc?.image_url) return { uri: svc.image_url };
  return CATEGORY_META[svc?.category]?.img || CATEGORY_META.otro.img;
};

export default function ServicesScreen({ navigation, route }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(route?.params?.filterCategory || null);
  const { data: services, loading, error, refetch } = useServices();

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
    <Card
      padding="none"
      onPress={() => navigation.navigate('Quote', { serviceId: item.id, serviceName: item.name, serviceCategory: item.category })}
      accessibilityLabel={`Cotizar ${item.name}`}
      className="overflow-hidden mb-4"
    >
      <Image source={getServiceImage(item)} className="w-full h-36" resizeMode="cover" />
      <View className="p-4">
        <View className="flex-row items-center gap-1.5 mb-1.5">
          <Zap size={14} color={ICON.brand} />
          <Text className="text-[11px] font-bold text-brand uppercase tracking-wider">
            {CATEGORY_META[item.category]?.label || item.category.replace('_', ' ')}
          </Text>
        </View>
        <Text className="text-[16px] font-bold text-ink mb-1">{item.name}</Text>
        {item.description ? (
          <Text className="text-[13px] text-gray-500 mb-3" numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View className="flex-row items-center justify-end">
          <View className="bg-brand px-4 py-2 rounded-xl">
            <Text className="text-white font-bold text-[13px]">Cotizar</Text>
          </View>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* ── Header & Search ── */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-gray-50 z-10">
        <Text className="text-[24px] font-extrabold text-ink mb-4">Servicios</Text>

        {/* Barra de búsqueda */}
        <View className="flex-row items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-3">
          <Search size={18} color={ICON.gray400} />
          <TextInput
            placeholder="¿Qué servicio buscas hoy?"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-[14px] font-medium text-ink"
            placeholderTextColor={ICON.gray400}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
              <X size={16} color={ICON.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Chips de categoría ── */}
        {!loading && categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-1">
            {/* Chip "Todos" */}
            <Pressable
              onPress={() => setActiveCategory(null)}
              accessibilityRole="button"
              accessibilityState={{ selected: !activeCategory }}
              className="mr-2 px-4 py-2 rounded-2xl border"
              style={{
                backgroundColor: !activeCategory ? ICON.brand : ICON.surface,
                borderColor:     !activeCategory ? ICON.brand : ICON.border,
              }}
            >
              <Text className="text-[13px] font-bold" style={{ color: !activeCategory ? ICON.surface : ICON.muted }}>
                Todos
              </Text>
            </Pressable>
            {categories.map(cat => {
              const active = activeCategory === cat.category;
              return (
                <Pressable
                  key={cat.category}
                  onPress={() => setActiveCategory(active ? null : cat.category)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className="mr-2 px-4 py-2 rounded-2xl border"
                  style={{
                    backgroundColor: active ? ICON.brand : ICON.surface,
                    borderColor:     active ? ICON.brand : ICON.border,
                  }}
                >
                  <Text className="text-[13px] font-bold" style={{ color: active ? ICON.surface : ICON.muted }}>
                    {CATEGORY_META[cat.category]?.label || cat.category.replace('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ── Lista ── */}
      <View className="flex-1 bg-gray-50/50">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={ICON.brand} />
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center px-8">
            <ErrorState message={error} onRetry={refetch} />
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
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-2"
                    onPress={() => { setSearch(''); setActiveCategory(null); }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
