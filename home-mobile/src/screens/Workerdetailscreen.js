import React, { useState } from 'react';
import {
    View, Text, ScrollView, Image, Alert, TouchableOpacity, Pressable, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    MapPin, Shield, Phone, MessageCircle,
    CalendarDays, FileSignature, Images, X,
} from 'lucide-react-native';
import { useWorker } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import {
    Button, BackButton, LoadingState, EmptyState,
} from '../components/ui';

const AVATAR_FALLBACK =
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop';

/**
 * Colores literales necesarios para props `color`/`iconColor` de
 * lucide-react-native — mismo patrón que Projectdetailscreen.js.
 */
const ICON = {
    brand: '#E8432D',   // = tokens.colors.brand.DEFAULT
    surface: '#ffffff', // = tokens.colors.surface.DEFAULT
};

const SERVICE_MAP = {
    pintura: 'Pintura Interior',
    enchapes: 'Enchapes de Baño',
    electricidad: 'Instalaciones Eléctricas',
    plomeria: 'Plomería General',
    obra_gris: 'Obra Gris',
    carpinteria: 'Carpintería en Madera',
    impermeabilizacion: 'Impermeabilización',
    remodelacion: 'Remodelación',
    techos: 'Techos y Cielos',
    pisos: 'Pisos',
    pintura_ext: 'Pintura Exterior',
    otro: 'Otro',
};

/* ─── Stat box ───────────────────────────────────────────────────── */
function StatBox({ label, value }) {
    return (
        <View className="flex-1 py-4 items-center border-r border-gray-100 last:border-0">
            <Text className="text-[17px] font-extrabold text-ink">{value}</Text>
            <Text className="text-[11px] text-gray-400 mt-0.5">{label}</Text>
        </View>
    );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
export default function WorkerDetailScreen({ route, navigation }) {
    const {
        workerId,
        serviceId = '',
        serviceName = 'Servicio',
        serviceCategory = '',
        city = '',
        address = '',
        sq_meters = '',
        occupied = '',
        notes = '',
    } = route.params || {};

    const { isAuthenticated } = useAuthStore();
    const { data: worker, loading } = useWorker(workerId);
    const [portfolioFilter, setPortfolioFilter] = useState(null);
    const [viewerPhoto, setViewerPhoto] = useState(null);

    /* ── Loading ── */
    if (loading) {
        return (
            <View className="flex-1 bg-white">
                <LoadingState fullScreen />
            </View>
        );
    }

    /* ── Not found ── */
    if (!worker) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white px-8">
                <EmptyState
                    title="Trabajador no encontrado"
                    action="Volver"
                    onAction={() => navigation.goBack()}
                />
            </SafeAreaView>
        );
    }

    const profile = worker.workerProfile || {};
    const selectedRate = worker.serviceRates?.find(rate => rate.specialty === serviceCategory);
    const stats = worker.stats || {};

    const avgRating = stats.rating_count && stats.rating_count > 0 
        ? parseFloat(stats.rating_avg).toFixed(1) + ' ★' 
        : 'Sin reseñas';
    const reviewCount = stats.rating_count ?? 0;
    const projectCount = stats.completed_projects ?? profile.completed_jobs ?? 0;
    const yearsExp = profile.years_experience ?? 0;
    const firstName = worker.name?.split(' ')[0] || 'Profesional';

    /* ── Contratar → CalendarScreen ── */
    const handleConfirm = () => {
        if (!isAuthenticated) {
            Alert.alert('Inicia sesión', 'Debes iniciar sesión para contratar a un profesional.');
            return;
        }
        if (!serviceId) {
            Alert.alert('Error', 'Falta la información del servicio. Vuelve a buscar.');
            navigation.navigate('ServicesTab');
            return;
        }
        navigation.navigate('Calendar', {
            workerId: worker.id,
            serviceId,
            serviceName,
            serviceCategory,
            city,
            address,
            sq_meters,
            occupied,
            notes,
            workerRateUnit: selectedRate?.price_unit || '',
            workerRateAmount: selectedRate?.amount || '',
            workerRateNote: selectedRate?.note || '',
        });
    };

    const handlePhone = () => {
        Alert.alert('Llamar', 'Contrata a este profesional para ver su teléfono ');
    };

    const handleChat = () => {
        Alert.alert('Chat', 'Inicia el proyecto primero para chatear ');
    };

    return (
        <View className="flex-1 bg-white">
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* ── Hero con foto ── */}
                <View className="relative h-64 bg-gray-200">
                    <Image
                        source={{ uri: worker.avatar || AVATAR_FALLBACK }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                    {/* Degradado inferior */}
                    <View
                        className="absolute inset-0"
                        style={{
                            background: undefined,
                            backgroundColor: 'transparent',
                        }}
                        pointerEvents="none"
                    >
                        {/* Overlay manual con View anidados para simular gradiente */}
                        <View className="absolute bottom-0 left-0 right-0 h-32"
                            style={{ backgroundColor: 'rgba(0,0,0,0.50)' }}
                        />
                    </View>

                    {/* Botón atrás */}
                    <SafeAreaView className="absolute top-0 left-0 right-0" edges={['top']}>
                        <BackButton
                            onPress={() => navigation.goBack()}
                            iconColor={ICON.surface}
                            className="m-4 !bg-white/20"
                        />
                    </SafeAreaView>

                    {/* Nombre y ciudad sobre la foto */}
                    <View className="absolute bottom-4 left-5 right-5 flex-row items-end justify-between">
                        <View className="flex-1 mr-3">
                            <Text className="text-2xl font-extrabold text-white">{worker.name}</Text>
                            <View className="flex-row items-center gap-1 mt-1">
                                <MapPin size={13} color="rgba(255,255,255,0.7)" />
                                <Text className="text-sm text-white/70">
                                    {profile.cities_covered?.[0] || city || 'Varias ciudades'}
                                </Text>
                            </View>
                        </View>
                        {profile.is_verified && (
                            <View className="flex-row items-center gap-1 bg-emerald-700 px-3 py-1.5 rounded-full">
                                <Shield size={13} color={ICON.surface} />
                                <Text className="text-white text-[11px] font-bold">Verificado</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ── Stats ── */}
                <View className="flex-row border-b border-gray-100">
                    {reviewCount > 0 && <StatBox label="Calificación" value={avgRating} />}
                    <StatBox label="Proyectos" value={projectCount} />
                    <StatBox label="Años exp." value={yearsExp} />
                </View>

                {/* ── Contenido ── */}
                <View className="px-5 pt-5">

                    {/* Bio */}
                    <Text className="font-bold text-[15px] text-ink mb-2">Sobre mí</Text>
                    <Text className="text-sm text-gray-500 leading-relaxed">
                        {profile.bio || 'Profesional dedicado y comprometido con la excelencia.'}
                    </Text>

                    {/* Precio publicado para el servicio seleccionado */}
                    {selectedRate && (
                        <View className="mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                                Precio para este servicio
                            </Text>
                            <Text className="text-[20px] font-black text-ink">
                                {selectedRate.price_unit === 'a_convenir' ? 'Cotiza tras revisar' : `$${Number(selectedRate.amount).toLocaleString('es-CO')} ${selectedRate.price_unit.replace('por_', 'por ')}`}
                            </Text>
                            <Text className="text-[12px] text-gray-500 mt-2">{selectedRate.includes_materials ? 'Incluye materiales. ' : 'No incluye materiales. '}{selectedRate.note || ''}</Text>
                        </View>
                    )}

                    {/* Servicio a contratar */}
                    {serviceName && serviceName !== 'Servicio' && (
                        <View className="mt-4 bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
                            <Text className="text-[11px] font-bold text-orange-400 uppercase tracking-wide mb-0.5">
                                Servicio a contratar
                            </Text>
                            <Text className="text-[14px] font-bold text-ink">{serviceName}</Text>
                            {city && (
                                <Text className="text-[12px] text-gray-500 mt-0.5">
                                    📍 {city}{address ? ` · ${address}` : ''}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Especialidades */}
                    {profile.specialties && profile.specialties.length > 0 && (
                        <View className="mt-5">
                            <Text className="text-[12px] text-gray-400 font-extrabold uppercase tracking-wider mb-3">
                                Servicios que ofrece
                            </Text>
                            <View className="rounded-2xl border border-gray-100 overflow-hidden">
                                {profile.specialties.map((key, idx) => (
                                    <View
                                        key={key}
                                        className={`px-4 py-3 bg-white ${idx < profile.specialties.length - 1 ? 'border-b border-gray-50' : ''
                                            }`}
                                    >
                                        <Text className="text-[14px] font-semibold text-ink">
                                            {SERVICE_MAP[key] || key}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Portafolio */}
                    {worker.portfolio && worker.portfolio.length > 0 && (() => {
                        const portfolioSpecialties = [...new Set(worker.portfolio.map(p => p.specialty))];
                        const filteredPhotos = portfolioFilter
                            ? worker.portfolio.filter(p => p.specialty === portfolioFilter)
                            : worker.portfolio;
                        return (
                            <View className="mt-5">
                                <View className="flex-row items-center gap-2 mb-3">
                                    <Images size={14} color={ICON.brand} />
                                    <Text className="text-[12px] text-gray-400 font-extrabold uppercase tracking-wider">
                                        Portafolio de trabajos
                                    </Text>
                                </View>

                                {portfolioSpecialties.length > 1 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                                        <TouchableOpacity
                                            onPress={() => setPortfolioFilter(null)}
                                            className="mr-2 px-3.5 py-1.5 rounded-2xl border"
                                            style={{ backgroundColor: !portfolioFilter ? ICON.brand : '#fff', borderColor: !portfolioFilter ? ICON.brand : '#e5e7eb' }}
                                        >
                                            <Text className={`text-[12px] font-bold ${!portfolioFilter ? 'text-white' : 'text-gray-500'}`}>Todos</Text>
                                        </TouchableOpacity>
                                        {portfolioSpecialties.map(key => {
                                            const active = portfolioFilter === key;
                                            return (
                                                <TouchableOpacity
                                                    key={key}
                                                    onPress={() => setPortfolioFilter(active ? null : key)}
                                                    className="mr-2 px-3.5 py-1.5 rounded-2xl border"
                                                    style={{ backgroundColor: active ? ICON.brand : '#fff', borderColor: active ? ICON.brand : '#e5e7eb' }}
                                                >
                                                    <Text className={`text-[12px] font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                                                        {SERVICE_MAP[key] || key}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}

                                <View className="flex-row flex-wrap gap-2">
                                    {filteredPhotos.map(photo => (
                                        <TouchableOpacity
                                            key={photo.id}
                                            onPress={() => setViewerPhoto(photo)}
                                            style={{ width: '31.5%', aspectRatio: 1 }}
                                            accessibilityRole="imagebutton"
                                            accessibilityLabel={photo.caption || 'Ver foto del portafolio'}
                                            activeOpacity={0.85}
                                        >
                                            <Image source={{ uri: photo.url }} className="w-full h-full rounded-xl" resizeMode="cover" />
                                            <View className="absolute bottom-1 left-1 right-1 bg-black/55 rounded-lg px-1.5 py-0.5">
                                                <Text className="text-white text-[9px] font-bold text-center" numberOfLines={1}>
                                                    {SERVICE_MAP[photo.specialty] || photo.specialty}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        );
                    })()}

                    {/* Botones secundarios — Llamar/Chat: funcionalidad simulada (solo
                        Alert), se preserva tal cual, solo se reskinea con Button. */}
                    <View className="flex-row gap-3 mt-6">
                        <Button
                            variant="secondary"
                            accessibilityLabel="Llamar"
                            className="flex-1 !bg-gray-100 !border-0 !rounded-2xl"
                            onPress={handlePhone}
                        >
                            <View className="flex-row items-center gap-2">
                                <Phone size={16} color="#4b5563" />
                                <Text className="text-[14px] font-semibold text-gray-600">Llamar</Text>
                            </View>
                        </Button>
                        <Button
                            variant="secondary"
                            accessibilityLabel="Chat"
                            className="flex-1 !bg-gray-100 !border-0 !rounded-2xl"
                            onPress={handleChat}
                        >
                            <View className="flex-row items-center gap-2">
                                <MessageCircle size={16} color="#4b5563" />
                                <Text className="text-[14px] font-semibold text-gray-600">Chat</Text>
                            </View>
                        </Button>
                    </View>
                </View>
            </ScrollView>

            {/* ── CTA fijo en la parte inferior ── */}
            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-4"
                style={{ paddingBottom: 34 }}
            >
                <Button
                    variant="primary"
                    fullWidth
                    style={{ shadowColor: ICON.brand, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
                    onPress={handleConfirm}
                >
                    {`Contratar a ${firstName}`}
                </Button>
                <Text className="text-center text-[12px] text-gray-400 mt-2">
                    Elegirás las fechas en el siguiente paso
                </Text>
            </View>

            {/* ── Visor de foto del portafolio ── */}
            <Modal visible={!!viewerPhoto} transparent animationType="fade" onRequestClose={() => setViewerPhoto(null)}>
                <Pressable
                    onPress={() => setViewerPhoto(null)}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}
                >
                    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                        <View className="flex-row justify-end px-4 pt-2">
                            <Pressable
                                onPress={() => setViewerPhoto(null)}
                                accessibilityRole="button"
                                accessibilityLabel="Cerrar"
                                className="w-12 h-12 rounded-full bg-white/15 items-center justify-center"
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X size={22} color="#fff" />
                            </Pressable>
                        </View>

                        {viewerPhoto && (
                            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
                                <Image
                                    source={{ uri: viewerPhoto.url }}
                                    style={{ width: '100%', height: '70%' }}
                                    resizeMode="contain"
                                />
                                {viewerPhoto.caption && (
                                    <Text className="text-white text-[14px] text-center mt-4 px-4">
                                        {viewerPhoto.caption}
                                    </Text>
                                )}
                            </View>
                        )}
                    </SafeAreaView>
                </Pressable>
            </Modal>
        </View>
    );
}
