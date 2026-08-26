import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput,
    Pressable, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import api from '../services/api';
import { BackButton, Button, LoadingState } from '../components/ui';

// Acento de calificación — deliberadamente fuera del mapa de status.js: el
// amber está atado al concepto de "rating/estrellas", no a un estado de
// proyecto (mismo criterio ya aplicado en Projectdetailscreen.js).
const RATING_COLOR = '#f59e0b';

const LABELS = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' };
const TAGS = ['Puntual', 'Limpio', 'Profesional', 'Buen precio', 'Comunicativo', 'Rápido'];

/* ══════════════════════════════════════════════════════════════════
   RATING SCREEN
   Params: { projectId, workerId, workerName }
══════════════════════════════════════════════════════════════════ */
export default function RatingScreen({ route, navigation }) {
    const {
        projectId,
        workerId,
        workerName = 'el trabajador',
        workerAvatar = null,
    } = route.params || {};

    const [score, setScore] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [canRate, setCanRate] = useState(null); // null = cargando

    useEffect(() => {
        if (projectId) checkCanRate();
    }, [projectId]);

    const checkCanRate = async () => {
        try {
            const res = await api.get(`/ratings/can-rate/${projectId}`);
            setCanRate(res.data.data);
        } catch {
            setCanRate({ canRate: false, reason: 'No pudimos verificar el estado. Revisa tu conexión.', networkError: true });
        }
    };

    const toggleTag = (tag) => {
        const marker = `#${tag}`;
        setComment(c =>
            c.includes(marker)
                ? c.replace(` ${marker}`, '').replace(marker, '').trim()
                : (c ? `${c} ${marker}` : marker)
        );
    };

    const handleSubmit = async () => {
        if (score === 0) {
            Alert.alert('Calificación requerida', 'Selecciona una cantidad de estrellas.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/ratings', {
                score,
                comment,
                worker_id: workerId,
                project_id: projectId,
            });
            Alert.alert('¡Gracias!', 'Tu calificación fue enviada.', [
                { text: 'OK', onPress: () => navigation.navigate('ProjectsTabScreen') },
            ]);
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'No se pudo enviar la calificación.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Cargando estado can-rate ── */
    if (canRate === null) {
        return (
            <View className="flex-1 bg-surface">
                <LoadingState fullScreen />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-surface">

            {/* ── Header ── */}
            <View className="flex-row items-center gap-3 px-5 pt-2 pb-4 border-b border-border">
                <BackButton onPress={() => navigation.goBack()} />
                <Text className="text-[17px] font-extrabold text-ink">Calificar servicio</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Avatar + nombre ── */}
                <View className="items-center pt-8 pb-6 px-5">
                    <View className="w-20 h-20 rounded-full bg-brand-soft items-center justify-center mb-3 overflow-hidden">
                        {workerAvatar ? (
                            <Image source={{ uri: workerAvatar }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <Text className="text-3xl font-extrabold text-brand">
                                {workerName[0]?.toUpperCase() || '?'}
                            </Text>
                        )}
                    </View>
                    <Text className="text-[20px] font-extrabold text-ink mb-1">{workerName}</Text>
                    <Text className="text-[13px] text-muted">¿Cómo fue tu experiencia?</Text>
                </View>

                {/* ── Ya calificado / no disponible ── */}
                {!canRate.canRate ? (
                    <View className="mx-5 bg-gray-50 rounded-3xl p-6 items-center gap-3">
                        {!canRate.existing && <Text className="text-4xl">🔒</Text>}
                        <Text className="text-[17px] font-extrabold text-ink text-center">
                            {canRate.existing ? 'Ya calificaste este proyecto' : 'No disponible'}
                        </Text>
                        <Text className="text-[13px] text-muted text-center">{canRate.reason}</Text>

                        {canRate.existing && (
                            <View className="flex-row gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star
                                        key={s}
                                        size={28}
                                        color={RATING_COLOR}
                                        fill={s <= canRate.existing.score ? RATING_COLOR : 'transparent'}
                                    />
                                ))}
                            </View>
                        )}

                        {canRate.networkError ? (
                            <Button variant="primary" size="md" className="mt-2" onPress={checkCanRate}>
                                Reintentar
                            </Button>
                        ) : (
                            <Button variant="primary" size="md" className="mt-2" onPress={() => navigation.navigate('ProjectsTabScreen')}>
                                Ver mis proyectos
                            </Button>
                        )}
                    </View>
                ) : (
                    <View className="px-5">
                        {/* Estrellas */}
                        <View className="flex-row justify-center gap-2 mb-3">
                            {[1, 2, 3, 4, 5].map(s => (
                                <Pressable
                                    key={s}
                                    onPress={() => setScore(s)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Calificar con ${s} estrella${s > 1 ? 's' : ''}`}
                                    className="active:scale-110 p-1"
                                >
                                    <Star
                                        size={44}
                                        strokeWidth={1.5}
                                        color={RATING_COLOR}
                                        fill={s <= score ? RATING_COLOR : 'transparent'}
                                    />
                                </Pressable>
                            ))}
                        </View>

                        {/* Label puntuación */}
                        <Text className="text-[16px] font-bold text-ink text-center mb-6 h-6">
                            {score ? LABELS[score] : ''}
                        </Text>

                        {/* Comentario */}
                        <View className="mb-2">
                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                placeholder="Cuéntanos más sobre tu experiencia (opcional)"
                                placeholderTextColor="#9ca3af"
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                                textAlignVertical="top"
                                className="bg-gray-100 rounded-2xl px-4 py-4 text-[15px] text-ink min-h-[100px]"
                            />
                            <Text className="text-right text-[11px] text-muted mt-1">
                                {comment.length}/500
                            </Text>
                        </View>

                        {/* Tags rápidos */}
                        <View className="mb-8">
                            <Text className="text-[13px] font-semibold text-muted mb-3">
                                ¿Qué destacas? (opcional)
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {TAGS.map(tag => {
                                    const active = comment.includes(`#${tag}`);
                                    return (
                                        <Button
                                            key={tag}
                                            variant={active ? 'primary' : 'secondary'}
                                            size="sm"
                                            className="!px-3 !py-1.5"
                                            onPress={() => toggleTag(tag)}
                                        >
                                            {tag}
                                        </Button>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* ── Botón enviar (fijo abajo) ── */}
            {canRate?.canRate && (
                <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-5 py-4">
                    <Button
                        variant="primary"
                        fullWidth
                        loading={loading}
                        disabled={score === 0}
                        accessibilityLabel="Enviar calificación"
                        onPress={handleSubmit}
                    >
                        {loading ? '' : 'Enviar calificación'}
                    </Button>
                </View>
            )}
        </SafeAreaView>
    );
}
