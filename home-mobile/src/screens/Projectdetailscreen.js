import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
    MapPin, MessageCircle, Star, Check, Camera, X, Calendar, Wallet,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProject, useProjectPhotos, usePayments } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import api from '../services/api';
import { getStatus } from '../design-system/status.js';
import {
    Button, IconButton, BackButton, Card, StatusBadge,
    LoadingState, ErrorState, EmptyState, Input,
} from '../components/ui';

/* ─── Etapas de las fotos del proyecto ──────────────────────────── */
const PHOTO_STAGES = [
    { key: 'antes', label: 'Antes' },
    { key: 'durante', label: 'Durante' },
    { key: 'despues', label: 'Después' },
];

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatDate(d) {
    if (!d) return 'Sin fecha asignada';
    return format(new Date(d), "d MMM yyyy", { locale: es });
}

/**
 * Colores literales necesarios para props `color`/`iconColor` de
 * lucide-react-native (los íconos SVG no aceptan clases de Tailwind).
 * Cada uno coincide exactamente con el token homónimo de
 * design-system/tokens.js — se centralizan aquí en vez de repetir el hex
 * suelto por el archivo.
 */
const ICON = {
    muted: '#6b7280',   // = tokens.colors.muted
    brand: '#E8432D',   // = tokens.colors.brand.DEFAULT
    surface: '#ffffff', // = tokens.colors.surface.DEFAULT
};

// Acento de calificación — deliberadamente fuera del mapa de status.js: el
// amber está atado al concepto de "rating/estrellas", no a un estado de
// proyecto (mismo criterio ya aplicado en WorkerProfileScreen.jsx, web).
const RATING_COLOR = '#f59e0b';

// Debe coincidir con PRE_PROGRESS_STATUSES en src/services/paymentService.js
// (backend) — estados en los que el proyecto todavía no arrancó ni terminó.
const PRE_PROGRESS_STATUSES = ['pendiente', 'en_revision', 'aprobado', 'pausado'];

/**
 * Prioridad de tarea — mapa LOCAL de esta pantalla, deliberadamente
 * separado de design-system/status.js (estado y prioridad son conceptos
 * semánticamente distintos). Reutiliza los tonos ya existentes del design
 * system (muted/info/warning/error) en vez de colores Tailwind sueltos.
 * Si "prioridad" aparece en más pantallas, evaluar promoverlo a un
 * concepto oficial del Design System — por ahora se queda local.
 */
const PRIORITY_UI = {
    baja: { label: 'Baja', dotClass: 'bg-muted' },
    media: { label: 'Media', dotClass: 'bg-info' },
    alta: { label: 'Alta', dotClass: 'bg-warning' },
    urgente: { label: 'Urgente', dotClass: 'bg-error' },
};

/* ─── Info row ───────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <View className="flex-row items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <View className="w-7 h-7 rounded-xl bg-gray-50 items-center justify-center">
                <Icon size={14} color={ICON.muted} />
            </View>
            <View className="flex-1">
                <Text className="text-[10px] text-muted font-semibold uppercase tracking-wide">{label}</Text>
                <Text className="text-[14px] text-ink font-semibold mt-0.5">{value}</Text>
            </View>
        </View>
    );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECT DETAIL SCREEN
══════════════════════════════════════════════════════════════════ */
export default function ProjectDetailScreen({ route, navigation }) {
    const { id } = route.params || {};
    const { user } = useAuthStore();
    const { data: project, loading, error, refetch } = useProject(id);
    const { data: photos, loading: loadingPhotos, error: errorPhotos, refetch: refetchPhotos } = useProjectPhotos(id);
    const { data: payments, refetch: refetchPayments } = usePayments(id);

    // Refresca al volver a esta pantalla — clave para reflejar un pago que
    // se acaba de confirmar al volver del navegador externo (PaymentScreen
    // no comparte esta instancia de useProject/usePayments).
    useFocusEffect(
        useCallback(() => {
            refetch();
            refetchPayments();
        }, [refetch, refetchPayments])
    );

    const [updating, setUpdating] = useState(false);
    const [photoStage, setPhotoStage] = useState('antes');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [viewerPhoto, setViewerPhoto] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [refundBank, setRefundBank] = useState({ bank_name: '', account_type: 'ahorros', account_number: '', account_holder_id_number: '' });

    /* ── Derived state ── */
    const tasks = project?.tasks || [];
    const done = tasks.filter(t => t.status === 'completada').length;

    const getTaskWeight = (status) => {
        if (status === 'completada') return 1;
        if (status === 'en_progreso') return 0.7;
        if (status === 'en_revision') return 0.3;
        return 0;
    };
    const totalWeight = tasks.reduce((acc, t) => acc + getTaskWeight(t.status), 0);
    const pct = tasks.length ? Math.round((totalWeight / tasks.length) * 100) : 0;

    const assignedWorker = project?.worker || tasks.find(t => t.assignee)?.assignee;
    const isCompleted = project?.status === 'completado';
    const myRating = (project?.ratings || []).find(r => r.reviewer_id === user?.id);

    /* ── Pago inicial (20%) — arrancar el proyecto ya no es una transición
       manual, requiere que el cliente pague. Ver paymentService.js. ── */
    const initialPayment = (payments || []).find(p => p.type === 'inicial');
    const needsInitialPayment = project
        && PRE_PROGRESS_STATUSES.includes(project.status)
        && initialPayment?.status !== 'aprobado';

    /* ── Pago final (80%) — siempre manual, se habilita al completar. ── */
    const finalPayment = (payments || []).find(p => p.type === 'final');
    const needsFinalPayment = project?.status === 'completado' && finalPayment?.status !== 'aprobado';

    /* ── Worker action button ── */
    const workerAction = () => {
        if (user?.role !== 'trabajador' || !project) return null;
        if (project.status === 'pendiente')
            return { label: 'Comenzar trabajo', status: 'en_revision' };
        if (project.status === 'en_progreso')
            return { label: 'Marcar como completado', status: 'completado' };
        return null;
    };
    const action = workerAction();

    const handleUpdateStatus = async (newStatus) => {
        if (updating) return;
        Alert.alert(
            'Confirmar cambio',
            `¿Cambiar estado a "${getStatus(newStatus).label}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    style: 'default',
                    onPress: async () => {
                        setUpdating(true);
                        try {
                            await api.patch(`/projects/${id}/status`, { status: newStatus });
                            refetch();
                        } catch {
                            Alert.alert('Error', 'No se pudo actualizar el estado. Intenta de nuevo.');
                        } finally {
                            setUpdating(false);
                        }
                    },
                },
            ]
        );
    };

    /* ── Cancelación (cliente) ── */
    const canCancel = user?.role === 'cliente' && project && !['completado', 'cancelado'].includes(project.status);
    const needsRefund = initialPayment?.status === 'aprobado';

    const submitCancel = async (refundBankDetails) => {
        setCancelling(true);
        try {
            await api.patch(`/projects/${id}/status`, { status: 'cancelado', refundBankDetails });
            setShowCancelForm(false);
            refetch();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'No se pudo cancelar el proyecto. Intenta de nuevo.');
        } finally {
            setCancelling(false);
        }
    };

    const handleCancelProject = () => {
        if (needsRefund) {
            // Ya se cobró el 20% inicial — se necesitan datos bancarios para el
            // reembolso (no hay una cuenta de cliente guardada de antes).
            setShowCancelForm(true);
            return;
        }
        Alert.alert(
            'Cancelar proyecto',
            '¿Seguro que quieres cancelar este proyecto? No se ha cobrado ningún pago todavía.',
            [
                { text: 'No', style: 'cancel' },
                { text: 'Sí, cancelar', style: 'destructive', onPress: () => submitCancel(null) },
            ]
        );
    };

    const canSubmitRefundForm = refundBank.bank_name.trim() && refundBank.account_number.trim() && refundBank.account_holder_id_number.trim();

    /* ── Fotos del proyecto ── */
    const canUploadPhotos = user?.role === 'trabajador' && project?.worker_id === user?.id;

    const uploadPhoto = async (asset) => {
        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('photo', {
                uri: asset.uri,
                name: asset.fileName || `foto-${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
            });
            formData.append('stage', photoStage);
            await api.post(`/projects/${id}/photos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            refetchPhotos();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'No se pudo subir la foto. Intenta de nuevo.');
        } finally {
            setUploadingPhoto(false);
        }
    };

    const pickImage = async (source) => {
        const perm = source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permiso necesario', 'Debes conceder acceso para agregar una foto.');
            return;
        }
        const options = { mediaTypes: ['images'], quality: 0.7 };
        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);
        if (result.canceled || !result.assets?.[0]) return;
        await uploadPhoto(result.assets[0]);
    };

    const handleAddPhoto = () => {
        Alert.alert('Agregar foto', `Etapa: ${PHOTO_STAGES.find(s => s.key === photoStage)?.label}`, [
            { text: 'Tomar foto', onPress: () => pickImage('camera') },
            { text: 'Elegir de la galería', onPress: () => pickImage('library') },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <LoadingState fullScreen />
            </SafeAreaView>
        );
    }

    /* ── Error ── */
    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
                <ErrorState message={error} onRetry={refetch} />
            </SafeAreaView>
        );
    }

    /* ── Not found ── */
    if (!project) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
                <EmptyState
                    title="Proyecto no encontrado"
                    action="Volver"
                    onAction={() => navigation.goBack()}
                />
            </SafeAreaView>
        );
    }

    /* ── Main render ── */
    return (
        <SafeAreaView className="flex-1 bg-background">

            {/* ── Sticky header ── */}
            <View className="bg-surface border-b border-border px-5 pt-2 pb-3 flex-row items-center gap-3">
                <BackButton onPress={() => navigation.goBack()} />
                <View className="flex-1">
                    <Text className="text-[16px] font-extrabold text-ink" numberOfLines={1}>
                        {project.title}
                    </Text>
                    <Text className="text-[12px] text-muted font-medium" numberOfLines={1}>
                        {project.service?.name || 'Proyecto'}
                    </Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 36, gap: 12 }}
            >

                {/* ── HERO / Status card ── */}
                <Card padding="sm">
                    <View className="mb-3">
                        <StatusBadge status={project.status} />
                    </View>

                    <Text className="text-[20px] font-extrabold text-ink mb-0.5">
                        {project.title}
                    </Text>
                    <Text className="text-[13px] text-muted font-medium mb-4">
                        {project.service?.name}
                    </Text>

                    {/* Progreso — patrón canónico: brand en curso, success al completar */}
                    {tasks.length > 0 && (
                        <View>
                            <View className="flex-row justify-between items-end mb-2">
                                <Text className="text-[12px] font-bold text-muted">Progreso general</Text>
                                <Text className="text-[14px] font-extrabold text-ink">{pct}%</Text>
                            </View>
                            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <View
                                    className={`h-full rounded-full ${pct >= 100 ? 'bg-success' : 'bg-brand'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </View>
                            <Text className="text-[11px] text-muted mt-2 text-right font-medium">
                                {done} de {tasks.length} tareas completadas
                            </Text>
                        </View>
                    )}
                </Card>

                {/* ── Pago inicial pendiente ── */}
                {needsInitialPayment && user?.role === 'cliente' && (
                    <Button
                        variant="primary"
                        fullWidth
                        accessibilityHint="Abre el pago del 20% inicial para arrancar el proyecto"
                        onPress={() => navigation.navigate('Payment', {
                            projectId: project.id,
                            projectTitle: project.title,
                            amount: Number(project.budget || 0) * 0.20,
                        })}
                    >
                        <View className="flex-row items-center gap-2">
                            <Wallet size={16} color={ICON.surface} />
                            <Text className="text-white font-extrabold text-[14px]">Pagar inicial y arrancar</Text>
                        </View>
                    </Button>
                )}
                {needsInitialPayment && user?.role === 'trabajador' && (
                    <Card padding="sm" className="!bg-amber-50 !border-amber-100">
                        <Text className="text-[13px] font-bold text-amber-700 text-center">
                            Esperando que el cliente pague el inicial para arrancar el proyecto.
                        </Text>
                    </Card>
                )}

                {/* ── Pago final pendiente ── */}
                {needsFinalPayment && user?.role === 'cliente' && (
                    <Button
                        variant="primary"
                        fullWidth
                        accessibilityHint="Abre el pago del 80% final del proyecto"
                        onPress={() => navigation.navigate('Payment', {
                            projectId: project.id,
                            projectTitle: project.title,
                            amount: Number(project.budget || 0) * 0.80,
                            type: 'final',
                        })}
                    >
                        <View className="flex-row items-center gap-2">
                            <Wallet size={16} color={ICON.surface} />
                            <Text className="text-white font-extrabold text-[14px]">Pagar final (80%)</Text>
                        </View>
                    </Button>
                )}
                {needsFinalPayment && user?.role === 'trabajador' && (
                    <Card padding="sm" className="!bg-amber-50 !border-amber-100">
                        <Text className="text-[13px] font-bold text-amber-700 text-center">
                            Esperando que el cliente pague el final para liberar tu pago.
                        </Text>
                    </Card>
                )}

                {/* ── Worker action ── */}
                {action && (
                    <Button
                        variant="primary"
                        fullWidth
                        loading={updating}
                        accessibilityHint="Te pedirá confirmar antes de aplicar el cambio"
                        onPress={() => handleUpdateStatus(action.status)}
                    >
                        {updating ? 'Actualizando...' : action.label}
                    </Button>
                )}

                {/* ── Detalles del proyecto ── */}
                <Card padding="sm">
                    <Text className="text-[13px] font-extrabold text-ink mb-1">Detalles</Text>
                    <InfoRow icon={Calendar} label="Fecha de inicio" value={formatDate(project.start_date)} />
                    {project.end_date && (
                        <InfoRow icon={Calendar} label="Fecha estimada fin" value={formatDate(project.end_date)} />
                    )}
                    {project.address && (
                        <InfoRow icon={MapPin} label="Dirección" value={project.address} />
                    )}
                    {project.city && (
                        <InfoRow icon={MapPin} label="Ciudad" value={project.city} />
                    )}
                </Card>

                {/* ── Contacto (cliente ↔ trabajador) ── */}
                {(assignedWorker || project.client) && (
                    <Card padding="sm">
                        <Text className="text-[13px] font-extrabold text-ink mb-3">
                            {user?.role === 'trabajador' ? 'Cliente' : 'Trabajador asignado'}
                        </Text>

                        <View className="flex-row items-center gap-3">
                            {/* Avatar */}
                            <View className="w-11 h-11 rounded-full bg-brand items-center justify-center overflow-hidden">
                                {(user?.role === 'trabajador' ? project.client?.avatar : assignedWorker?.avatar) ? (
                                    <Image
                                        source={{ uri: user?.role === 'trabajador' ? project.client.avatar : assignedWorker.avatar }}
                                        className="w-full h-full"
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text className="text-white font-extrabold text-[16px]">
                                        {(user?.role === 'trabajador'
                                            ? project.client?.name
                                            : assignedWorker?.name
                                        )?.[0]?.toUpperCase() || '?'}
                                    </Text>
                                )}
                            </View>

                            <View className="flex-1">
                                <Text className="text-[15px] font-extrabold text-ink">
                                    {user?.role === 'trabajador'
                                        ? project.client?.name
                                        : (assignedWorker?.name || 'Sin asignar')}
                                </Text>
                                {!assignedWorker && user?.role !== 'trabajador' && (
                                    <Text className="text-[12px] text-muted">Pendiente de asignación</Text>
                                )}
                            </View>

                            {/* Chat button */}
                            <IconButton
                                icon={MessageCircle}
                                variant="ghost"
                                className="!bg-brand/10"
                                iconColor={ICON.brand}
                                accessibilityLabel="Enviar mensaje"
                                onPress={() => navigation.navigate('Chat', { projectId: project.id })}
                            />
                        </View>
                    </Card>
                )}

                {/* ── Fotos del proyecto ── */}
                <Card padding="sm">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-[13px] font-extrabold text-ink">Fotos del proyecto</Text>
                        {canUploadPhotos && (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={uploadingPhoto}
                                className="!bg-brand/10"
                                accessibilityLabel="Agregar foto"
                                onPress={handleAddPhoto}
                            >
                                <View className="flex-row items-center gap-1.5">
                                    {uploadingPhoto
                                        ? <ActivityIndicator size="small" color={ICON.brand} />
                                        : <Camera size={14} color={ICON.brand} />
                                    }
                                    <Text className="text-[12px] font-bold text-brand">Agregar</Text>
                                </View>
                            </Button>
                        )}
                    </View>

                    {/* Tabs de etapa */}
                    <View className="flex-row gap-2 mb-3">
                        {PHOTO_STAGES.map(s => {
                            const count = (photos || []).filter(p => p.stage === s.key).length;
                            const active = photoStage === s.key;
                            return (
                                <TouchableOpacity
                                    key={s.key}
                                    onPress={() => setPhotoStage(s.key)}
                                    accessibilityRole="tab"
                                    accessibilityState={{ selected: active }}
                                    className={`flex-1 py-2 rounded-xl items-center ${active ? 'bg-brand' : 'bg-gray-100'}`}
                                >
                                    <Text className={`text-[12px] font-bold ${active ? 'text-white' : 'text-muted'}`}>
                                        {s.label}{count > 0 ? ` (${count})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {loadingPhotos ? (
                        <ActivityIndicator size="small" color={ICON.brand} style={{ paddingVertical: 16 }} />
                    ) : errorPhotos ? (
                        <View className="py-4 items-center">
                            <Text className="text-[13px] text-error text-center mb-2">{errorPhotos}</Text>
                            <Button variant="secondary" size="sm" onPress={refetchPhotos}>Reintentar</Button>
                        </View>
                    ) : (() => {
                        const stagePhotos = (photos || []).filter(p => p.stage === photoStage);
                        if (stagePhotos.length === 0) {
                            return (
                                <Text className="text-[13px] text-muted text-center py-6">
                                    {canUploadPhotos
                                        ? 'Aún no subes fotos de esta etapa.'
                                        : 'Aún no hay fotos de esta etapa.'}
                                </Text>
                            );
                        }
                        return (
                            <View className="flex-row flex-wrap gap-2">
                                {stagePhotos.map((p, i) => (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => setViewerPhoto(p)}
                                        accessibilityRole="imagebutton"
                                        accessibilityLabel={`Ver foto ${i + 1} de ${stagePhotos.length}`}
                                        style={{ width: '31.5%', aspectRatio: 1 }}
                                        activeOpacity={0.85}
                                    >
                                        <Image source={{ uri: p.url }} className="w-full h-full rounded-xl" resizeMode="cover" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    })()}
                </Card>

                {/* ── Tareas ── */}
                <Card padding="sm">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-[13px] font-extrabold text-ink">
                            Tareas
                        </Text>
                        <Text className="text-[12px] font-bold text-muted">
                            {done}/{tasks.length}
                        </Text>
                    </View>

                    {tasks.length === 0 ? (
                        <Text className="text-[13px] text-muted text-center py-4">
                            No hay tareas para este proyecto.
                        </Text>
                    ) : (
                        <View className="gap-2">
                            {tasks.map(task => {
                                const isTaskDone = task.status === 'completada';
                                const priorityDef = PRIORITY_UI[task.priority] || PRIORITY_UI.media;

                                return (
                                    <View
                                        key={task.id}
                                        className="flex-row items-start gap-3 p-3 bg-gray-50 rounded-xl"
                                    >
                                        {/* Checkbox visual */}
                                        <View className={`w-5 h-5 rounded-full mt-0.5 items-center justify-center border ${isTaskDone
                                                ? 'bg-brand border-brand'
                                                : 'border-gray-300 bg-surface'
                                            }`}>
                                            {isTaskDone && <Check size={11} color={ICON.surface} strokeWidth={3} />}
                                        </View>

                                        {/* Task info */}
                                        <View className="flex-1">
                                            <Text
                                                className={`text-[14px] font-semibold ${isTaskDone ? 'text-muted line-through' : 'text-ink'
                                                    }`}
                                                numberOfLines={2}
                                            >
                                                {task.title}
                                            </Text>

                                            <View className="flex-row items-center gap-2 mt-1.5">
                                                <StatusBadge status={task.status} />

                                                {/* Priority dot */}
                                                {task.priority && (
                                                    <View className="flex-row items-center gap-1">
                                                        <View className={`w-2 h-2 rounded-full ${priorityDef.dotClass}`} />
                                                        <Text className="text-[10px] text-muted capitalize">
                                                            {task.priority}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </Card>

                {/* ── Calificación (cliente, proyecto completado) ── */}
                {isCompleted && assignedWorker && user?.role === 'cliente' && (
                    myRating ? (
                        <Card padding="sm">
                            <Text className="text-[13px] font-extrabold text-ink mb-2">
                                Tu calificación a {assignedWorker.name.split(' ')[0]}
                            </Text>
                            <View className="flex-row items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <Star
                                        key={n}
                                        size={18}
                                        color={RATING_COLOR}
                                        fill={n <= myRating.score ? RATING_COLOR : 'transparent'}
                                    />
                                ))}
                                <Text className="text-[13px] font-bold text-muted ml-1">
                                    {myRating.score}/5
                                </Text>
                            </View>
                            {myRating.comment ? (
                                <Text className="text-[13px] text-gray-600 leading-relaxed italic">
                                    "{myRating.comment}"
                                </Text>
                            ) : null}
                        </Card>
                    ) : (
                        <Button
                            variant="secondary"
                            fullWidth
                            className="!bg-amber-50 !border-amber-100"
                            accessibilityLabel={`Calificar a ${assignedWorker.name.split(' ')[0]}`}
                            onPress={() =>
                                navigation.navigate('Rating', {
                                    projectId: project.id,
                                    workerId: assignedWorker.id,
                                    workerName: assignedWorker.name,
                                    workerAvatar: assignedWorker.avatar,
                                })
                            }
                        >
                            <View className="flex-row items-center gap-2.5">
                                <Star size={18} color={RATING_COLOR} fill={RATING_COLOR} />
                                <Text className="text-[14px] font-extrabold text-amber-600">
                                    Calificar a {assignedWorker.name.split(' ')[0]}
                                </Text>
                            </View>
                        </Button>
                    )
                )}

                {/* ── Cancelar proyecto (cliente) ── */}
                {canCancel && (
                    <Button variant="ghost" fullWidth onPress={handleCancelProject} loading={cancelling}>
                        <Text className="text-[13px] font-bold text-error">
                            {cancelling ? 'Cancelando...' : 'Cancelar proyecto'}
                        </Text>
                    </Button>
                )}

            </ScrollView>

            {/* ── Visor de foto a pantalla completa ── */}
            <Modal visible={!!viewerPhoto} transparent animationType="fade" onRequestClose={() => setViewerPhoto(null)}>
                <View className="flex-1 bg-black/90 items-center justify-center">
                    <View className="absolute top-14 right-5 z-10">
                        <IconButton
                            icon={X}
                            variant="ghost"
                            className="!bg-white/10"
                            iconColor={ICON.surface}
                            accessibilityLabel="Cerrar foto"
                            onPress={() => setViewerPhoto(null)}
                        />
                    </View>
                    {viewerPhoto && (
                        <Image
                            source={{ uri: viewerPhoto.url }}
                            style={{ width: '100%', height: '70%' }}
                            resizeMode="contain"
                        />
                    )}
                    {viewerPhoto?.caption && (
                        <Text className="text-white text-[13px] px-8 mt-4 text-center">{viewerPhoto.caption}</Text>
                    )}
                </View>
            </Modal>

            {/* ── Cancelar con reembolso: pide cuenta bancaria antes de confirmar ── */}
            <Modal visible={showCancelForm} transparent animationType="slide" onRequestClose={() => setShowCancelForm(false)}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-surface rounded-t-3xl p-5" style={{ gap: 12 }}>
                        <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-[15px] font-extrabold text-ink">Cancelar y pedir reembolso</Text>
                            <IconButton icon={X} variant="ghost" accessibilityLabel="Cerrar" onPress={() => setShowCancelForm(false)} />
                        </View>
                        <Text className="text-[12px] text-muted -mt-2 mb-1">
                            Ya pagaste el inicial de este proyecto. Indica la cuenta a la que quieres que te devolvamos el
                            saldo — HOME define una penalización caso por caso antes de aprobar el reembolso.
                        </Text>

                        <Input
                            label="Banco"
                            placeholder="Ej. Bancolombia"
                            value={refundBank.bank_name}
                            onChangeText={(v) => setRefundBank(f => ({ ...f, bank_name: v }))}
                        />
                        <View>
                            <Text className="text-[12px] font-semibold text-ink mb-1.5">Tipo de cuenta</Text>
                            <View className="flex-row gap-2">
                                {[{ key: 'ahorros', label: 'Ahorros' }, { key: 'corriente', label: 'Corriente' }].map(t => (
                                    <Button
                                        key={t.key}
                                        variant={refundBank.account_type === t.key ? 'primary' : 'secondary'}
                                        size="sm"
                                        className="flex-1"
                                        onPress={() => setRefundBank(f => ({ ...f, account_type: t.key }))}
                                    >
                                        {t.label}
                                    </Button>
                                ))}
                            </View>
                        </View>
                        <Input
                            label="Número de cuenta"
                            keyboardType="number-pad"
                            value={refundBank.account_number}
                            onChangeText={(v) => setRefundBank(f => ({ ...f, account_number: v.replace(/\D/g, '') }))}
                        />
                        <Input
                            label="Cédula del titular"
                            keyboardType="number-pad"
                            value={refundBank.account_holder_id_number}
                            onChangeText={(v) => setRefundBank(f => ({ ...f, account_holder_id_number: v.replace(/\D/g, '') }))}
                        />

                        <Button
                            variant="primary"
                            fullWidth
                            loading={cancelling}
                            disabled={!canSubmitRefundForm}
                            className="!bg-error"
                            onPress={() => submitCancel(refundBank)}
                        >
                            {cancelling ? 'Cancelando...' : 'Confirmar cancelación'}
                        </Button>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
