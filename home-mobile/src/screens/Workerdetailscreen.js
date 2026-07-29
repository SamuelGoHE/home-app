import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, MapPin, Shield, Phone, MessageCircle,
} from 'lucide-react-native';
import { useWorker } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';

const AVATAR_FALLBACK =
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop';

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
            <Text className="text-[17px] font-extrabold text-[#111]">{value}</Text>
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

    /* ── Loading ── */
    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#E8432D" />
            </View>
        );
    }

    /* ── Not found ── */
    if (!worker) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-white">
                <Text className="text-gray-400 text-[15px]">Trabajador no encontrado</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text className="text-[#E8432D] font-semibold">Volver</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const profile = worker.workerProfile || {};
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
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="m-4 w-9 h-9 items-center justify-center rounded-xl"
                            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        >
                            <ArrowLeft size={18} color="#fff" />
                        </TouchableOpacity>
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
                                <Shield size={13} color="#fff" />
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
                    <Text className="font-bold text-[15px] text-[#111] mb-2">Sobre mí</Text>
                    <Text className="text-sm text-gray-500 leading-relaxed">
                        {profile.bio || 'Profesional dedicado y comprometido con la excelencia.'}
                    </Text>

                    {/* Servicio a contratar */}
                    {serviceName && serviceName !== 'Servicio' && (
                        <View className="mt-4 bg-orange-50 rounded-2xl px-4 py-3 border border-orange-100">
                            <Text className="text-[11px] font-bold text-orange-400 uppercase tracking-wide mb-0.5">
                                Servicio a contratar
                            </Text>
                            <Text className="text-[14px] font-bold text-[#111]">{serviceName}</Text>
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
                                        <Text className="text-[14px] font-semibold text-[#111]">
                                            {SERVICE_MAP[key] || key}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Botones secundarios */}
                    <View className="flex-row gap-3 mt-6">
                        <TouchableOpacity
                            onPress={handlePhone}
                            className="flex-1 flex-row items-center justify-center gap-2 py-3 bg-gray-100 rounded-2xl"
                            activeOpacity={0.75}
                        >
                            <Phone size={16} color="#4b5563" />
                            <Text className="text-[14px] font-semibold text-gray-600">Llamar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleChat}
                            className="flex-1 flex-row items-center justify-center gap-2 py-3 bg-gray-100 rounded-2xl"
                            activeOpacity={0.75}
                        >
                            <MessageCircle size={16} color="#4b5563" />
                            <Text className="text-[14px] font-semibold text-gray-600">Chat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* ── CTA fijo en la parte inferior ── */}
            <View
                className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-4"
                style={{ paddingBottom: 34 }}
            >
                <TouchableOpacity
                    onPress={handleConfirm}
                    className="w-full py-4 bg-[#E8432D] rounded-full items-center shadow-md"
                    style={{ shadowColor: '#E8432D', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
                    activeOpacity={0.85}
                >
                    <Text className="text-white text-[17px] font-bold">Contratar a {firstName}</Text>
                </TouchableOpacity>
                <Text className="text-center text-[12px] text-gray-400 mt-2">
                    Elegirás las fechas en el siguiente paso
                </Text>
            </View>
        </View>
    );
}