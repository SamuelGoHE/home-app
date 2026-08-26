import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, MapPin, MessageSquare } from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../context/authStore';
import { BackButton, Card, EmptyState, ErrorState } from '../components/ui';

/**
 * Colores literales necesarios para props `color`/`fill` de
 * lucide-react-native (los íconos SVG no aceptan clases de Tailwind).
 * Mismo patrón que Projectdetailscreen.js (piloto).
 */
const ICON = {
    brand: '#E8432D',      // = tokens.colors.brand.DEFAULT — estrellas "llenas" (no es el acento amber de rating)
    starEmpty: '#e5e7eb',  // = Tailwind gray-200 — borde de estrella "vacía"
    starEmptyFill: '#f3f4f6', // = Tailwind gray-100 — relleno de estrella "vacía"
    muted: '#9ca3af',      // = Tailwind gray-400
    mutedLight: '#d1d5db', // = Tailwind gray-300
};

// Acento de calificación — deliberadamente fuera del mapa de status.js: el
// amber está atado al concepto de "rating/estrellas", no a un estado de
// proyecto (mismo criterio ya aplicado en Projectdetailscreen.js).
const RATING_COLOR = '#f59e0b';

/* ─── Fila de estrellas ──────────────────────────────────────────── */
function StarRow({ score }) {
    return (
        <View className="flex-row items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={14}
                    color={n <= score ? ICON.brand : ICON.starEmpty}
                    fill={n <= score ? ICON.brand : ICON.starEmptyFill}
                />
            ))}
        </View>
    );
}

/* ─── Skeleton card ──────────────────────────────────────────────── */
// Nota: esta implementación local NO se toca en esta fase — ver comentario
// en components/ui/Skeleton.js, que documenta esta pantalla como una de las
// dos existentes que se dejan tal cual hasta una fase futura.
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
    const [error, setError] = useState(null);

    const load = React.useCallback(async () => {
        setLoading(true);
        setError(null);
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
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudieron cargar las calificaciones');
        } finally {
            setLoading(false);
        }
    }, [isWorker, user?.id]);

    useEffect(() => { load(); }, [load]);

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="bg-surface px-5 pt-4 pb-4 flex-row items-center gap-3 border-b border-border">
                <BackButton onPress={() => navigation.goBack()} />
                <Text className="font-extrabold text-[17px] text-ink">Mis calificaciones</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Resumen del trabajador */}
                {!loading && isWorker && summary && (summary.count > 0) && (
                    <Card padding="md" className="mb-5 flex-row items-center gap-4">
                        <View className="w-20 h-20 rounded-3xl bg-amber-50 items-center justify-center">
                            <Text className="text-[28px] font-extrabold text-amber-500">
                                {Number(summary.avg).toFixed(1)}
                            </Text>
                        </View>
                        <View className="flex-1">
                            <StarRow score={Math.round(summary.avg)} />
                            <Text className="text-[13px] text-muted font-medium mt-1.5">
                                Promedio de {summary.count} calificación{summary.count !== 1 ? 'es' : ''}
                            </Text>
                            <Text className="text-[12px] text-muted mt-0.5">
                                Lo que tus clientes opinan de tu trabajo
                            </Text>
                        </View>
                    </Card>
                )}

                {/* Skeletons */}
                {loading && [1, 2, 3].map((i) => (
                    <View key={i} className="mb-3">
                        <SkeletonCard />
                    </View>
                ))}

                {/* Error state */}
                {!loading && error && (
                    <View className="mt-4">
                        <ErrorState message={error} onRetry={load} />
                    </View>
                )}

                {/* Empty state */}
                {!loading && !error && ratings.length === 0 && (
                    <View className="mt-4">
                        <EmptyState
                            icon={<Star size={20} color={RATING_COLOR} fill={RATING_COLOR} />}
                            title="Sin calificaciones aún"
                            subtitle={isWorker
                                ? 'Cuando un cliente califique tu trabajo, aparecerá aquí.'
                                : 'Cuando completes un proyecto y califiques al trabajador, aparecerá aquí.'}
                        />
                    </View>
                )}

                {/* Tarjetas */}
                {!loading && !error && ratings.map((r) => {
                    // Para el trabajador, la "persona" es quien lo calificó (reviewer/cliente).
                    // Para el cliente, es el trabajador que calificó.
                    const person = isWorker ? r.reviewer : r.worker;
                    const canOpenProfile = !isWorker && !!r.worker?.id;
                    return (
                        <Card
                            key={r.id}
                            padding="md"
                            className="mb-3"
                            onPress={canOpenProfile ? () => navigation.navigate('HomeTab', { screen: 'WorkerDetail', params: { workerId: r.worker.id } }) : undefined}
                            accessibilityLabel={canOpenProfile ? `Ver perfil de ${person?.name || 'trabajador'}` : undefined}
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
                                            <Text className="text-lg font-extrabold text-muted">
                                                {person?.name?.[0]?.toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View className="flex-1 min-w-0">
                                    <Text className="font-extrabold text-[15px] text-ink" numberOfLines={1}>
                                        {person?.name || (isWorker ? 'Cliente' : 'Trabajador')}
                                    </Text>
                                    {r.project?.city && (
                                        <View className="flex-row items-center gap-1 mt-0.5">
                                            <MapPin size={11} color={ICON.muted} />
                                            <Text className="text-[12px] text-muted">{r.project.city}</Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="text-[11px] text-muted font-medium flex-shrink-0">
                                    {new Date(r.createdAt).toLocaleDateString('es-CO', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                </Text>
                            </View>

                            {/* Estrellas + proyecto */}
                            <View className="flex-row items-center justify-between mb-2">
                                <StarRow score={r.score} />
                                <Text className="text-[11px] font-semibold text-muted max-w-[55%] text-right" numberOfLines={1}>
                                    {r.project?.title}
                                </Text>
                            </View>

                            {/* Comentario */}
                            {r.comment && (
                                <View className="flex-row items-start gap-2 mt-2 pt-2 border-t border-border">
                                    <MessageSquare size={13} color={ICON.mutedLight} style={{ marginTop: 2 }} />
                                    <Text className="flex-1 text-[13px] text-muted leading-relaxed">{r.comment}</Text>
                                </View>
                            )}
                        </Card>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}
