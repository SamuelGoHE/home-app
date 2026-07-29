import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, MapPin, MessageSquare } from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../context/authStore';

/* ─── Fila de estrellas ──────────────────────────────────────────── */
function StarRow({ score }) {
    return (
        <View className="flex-row items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={14}
                    color={n <= score ? '#E8432D' : '#e5e7eb'}
                    fill={n <= score ? '#E8432D' : '#f3f4f6'}
                />
            ))}
        </View>
    );
}

/* ─── Skeleton card ──────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center gap-3 mb-3">
                <View className="w-12 h-12 rounded-xl bg-gray-100" />
                <View className="flex-1 gap-2">
                    <View className="h-3.5 bg-gray-100 rounded-full w-2/3" />
                    <View className="h-3 bg-gray-50 rounded-full w-1/2" />
                </View>
            </View>
        </View>
    );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
export default function MyRatingsScreen({ navigation }) {
    const { user } = useAuthStore();
    const isWorker = user?.role === 'trabajador';

    const [ratings, setRatings] = useState([]);
    const [summary, setSummary] = useState(null); // { avg, count } solo para trabajador
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                if (isWorker) {
                    // El trabajador ve las calificaciones que RECIBIÓ
                    const res = await api.get(`/ratings/worker/${user.id}`);
                    const data = res.data.data || {};
                    setRatings(data.ratings || []);
                    setSummary({
                        avg:   data.worker?.rating_avg ?? 0,
                        count: data.worker?.rating_count ?? (data.ratings?.length || 0),
                    });
                } else {
                    // El cliente ve las calificaciones que DIO
                    const res = await api.get('/ratings/my');
                    setRatings(res.data.data || []);
                }
            } catch {
                Alert.alert('Error', 'No se pudieron cargar las calificaciones');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isWorker, user?.id]);

    return (
        <SafeAreaView className="flex-1 bg-[#f8f9fb]">
            {/* Header */}
            <View className="bg-white px-5 pt-4 pb-4 flex-row items-center gap-3 border-b border-gray-100">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-9 h-9 items-center justify-center rounded-xl bg-gray-100"
                >
                    <ArrowLeft size={18} color="#4b5563" />
                </TouchableOpacity>
                <Text className="font-extrabold text-[17px] text-[#111]">Mis calificaciones</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Resumen del trabajador */}
                {!loading && isWorker && summary && (summary.count > 0) && (
                    <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-5 flex-row items-center gap-4">
                        <View className="w-20 h-20 rounded-3xl bg-amber-50 items-center justify-center">
                            <Text className="text-[28px] font-extrabold text-amber-500">
                                {Number(summary.avg).toFixed(1)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <StarRow score={Math.round(summary.avg)} />
                            <Text className="text-[13px] text-gray-500 font-medium mt-1.5">
                                Promedio de {summary.count} calificación{summary.count !== 1 ? 'es' : ''}
                            </Text>
                            <Text className="text-[12px] text-gray-400 mt-0.5">
                                Lo que tus clientes opinan de tu trabajo
                            </Text>
                        </View>
                    </View>
                )}

                {/* Skeletons */}
                {loading && [1, 2, 3].map((i) => (
                    <View key={i} className="mb-3">
                        <SkeletonCard />
                    </View>
                ))}

                {/* Empty state */}
                {!loading && ratings.length === 0 && (
                    <View className="bg-white rounded-3xl p-12 items-center border border-gray-100 shadow-sm mt-4">
                        <View className="w-16 h-16 bg-amber-50 rounded-2xl items-center justify-center mb-4">
                            <Star size={26} color="#f59e0b" fill="#f59e0b" />
                        </View>
                        <Text className="font-bold text-gray-400 text-[15px]">Sin calificaciones aún</Text>
                        <Text className="text-gray-300 text-[13px] mt-1 text-center px-6">
                            {isWorker
                                ? 'Cuando un cliente califique tu trabajo, aparecerá aquí.'
                                : 'Cuando completes un proyecto y califiques al trabajador, aparecerá aquí.'}
                        </Text>
                    </View>
                )}

                {/* Tarjetas */}
                {!loading && ratings.map((r) => {
                    // Para el trabajador, la "persona" es quien lo calificó (reviewer/cliente).
                    // Para el cliente, es el trabajador que calificó.
                    const person = isWorker ? r.reviewer : r.worker;
                    return (
                        <TouchableOpacity
                            key={r.id}
                            onPress={() => {
                                if (!isWorker && r.worker?.id) {
                                    navigation.navigate('WorkerDetail', { workerId: r.worker.id });
                                }
                            }}
                            disabled={isWorker}
                            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3"
                            activeOpacity={isWorker ? 1 : 0.85}
                        >
                            {/* Persona info */}
                            <View className="flex-row items-center gap-3 mb-3">
                                <View className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                    {person?.avatar ? (
                                        <Image
                                            source={{ uri: person.avatar }}
                                            className="w-full h-full"
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View className="w-full h-full items-center justify-center">
                                            <Text className="text-lg font-extrabold text-gray-300">
                                                {person?.name?.[0]?.toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View className="flex-1 min-w-0">
                                    <Text className="font-extrabold text-[15px] text-[#111]" numberOfLines={1}>
                                        {person?.name || (isWorker ? 'Cliente' : 'Trabajador')}
                                    </Text>
                                    {r.project?.city && (
                                        <View className="flex-row items-center gap-1 mt-0.5">
                                            <MapPin size={11} color="#9ca3af" />
                                            <Text className="text-[12px] text-gray-400">{r.project.city}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="text-[11px] text-gray-300 font-medium flex-shrink-0">
                                    {new Date(r.createdAt).toLocaleDateString('es-CO', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                </Text>
                            </View>

                            {/* Estrellas + proyecto */}
                            <View className="flex-row items-center justify-between mb-2">
                                <StarRow score={r.score} />
                                <Text className="text-[11px] font-semibold text-gray-400 max-w-[55%] text-right" numberOfLines={1}>
                                    {r.project?.title}
                                </Text>
                            </View>

                            {/* Comentario */}
                            {r.comment && (
                                <View className="flex-row items-start gap-2 mt-2 pt-2 border-t border-gray-50">
                                    <MessageSquare size={13} color="#d1d5db" style={{ marginTop: 2 }} />
                                    <Text className="flex-1 text-[13px] text-gray-500 leading-relaxed">{r.comment}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}
