import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Search, X,
    ChevronRight, Calendar, Star, Wallet,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useProjects, useMyQuotes } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button, IconButton, Card, StatusBadge, EmptyState, ErrorState } from '../components/ui';

/**
 * Colores literales necesarios para props `color` de lucide-react-native
 * (los íconos SVG no aceptan clases de Tailwind). Mismo patrón que
 * Projectdetailscreen.js (piloto).
 */
const ICON = {
    brand: '#E8432D', // = tokens.colors.brand.DEFAULT
    muted: '#9ca3af', // gris neutro para íconos secundarios (mismo valor que placeholderTextColor en Input.js)
};

// Acento de calificación — deliberadamente fuera del mapa de status.js: el
// amber está atado al concepto de "rating/estrellas", no a un estado de
// proyecto (mismo criterio ya aplicado en Projectdetailscreen.js).
const RATING_COLOR = '#f59e0b';

// Debe coincidir con PRE_PROGRESS_STATUSES en src/services/paymentService.js
// (backend) y HomeScreen.js — estados donde el proyecto siempre implica que
// falta el pago inicial (ver Projectdetailscreen.js, misma lógica).
const PRE_PROGRESS_STATUSES = ['pendiente', 'en_revision', 'aprobado', 'pausado'];

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatDate(d) {
    if (!d) return null;
    return format(new Date(d), "d MMM yyyy", { locale: es });
}

/* ─── Skeleton card ──────────────────────────────────────────────── */
// Nota: esta implementación local NO se toca en esta fase — ver comentario
// en components/ui/Skeleton.js, que documenta esta pantalla como una de las
// dos existentes que se dejan tal cual hasta una fase futura.
function CardSkeleton() {
    return (
        <View className="bg-white rounded-3xl p-4 border border-gray-100 mb-4">
            <View className="h-5 w-24 bg-gray-100 rounded-lg mb-3" />
            <View className="h-4 w-48 bg-gray-100 rounded-lg mb-2" />
            <View className="h-3 w-32 bg-gray-50 rounded-lg mb-4" />
            <View className="h-2 bg-gray-100 rounded-full" />
        </View>
    );
}

/* ══════════════════════════════════════════════════════════════════
   PROJECTS SCREEN
══════════════════════════════════════════════════════════════════ */
export default function ProjectsScreen({ navigation }) {
    const { user } = useAuthStore();
    const isClient = user?.role === 'cliente';
    const { data: projects, loading, error, refetch: refetchProjects } = useProjects();
    const { data: quotes, refetch: refetchQuotes } = useMyQuotes();

    const [filter, setFilter] = useState('todos');
    const [search, setSearch] = useState('');

    // Refrescar cuando la pantalla entra en foco (ej. después de enviar cotización)
    useFocusEffect(
        useCallback(() => {
            refetchProjects();
            refetchQuotes();
        }, [refetchProjects, refetchQuotes])
    );

    // IDs de quotes que ya tienen proyecto (aceptadas) — para no duplicar
    const acceptedQuoteIds = useMemo(() => {
        if (!quotes) return new Set();
        return new Set(quotes.filter(q => q.status === 'aceptada').map(q => q.id));
    }, [quotes]);

    // Cotizaciones pendientes o rechazadas que no tienen proyecto aún
    const pendingQuotes = useMemo(() => {
        if (!quotes) return [];
        return quotes
            .filter(q => (q.status === 'solicitud_pendiente' || q.status === 'rechazada') && !acceptedQuoteIds.has(q.id))
            .map(q => ({
                _isQuote: true,
                id: `quote-${q.id}`,
                title: q.service?.name || 'Cotización',
                status: q.status,
                service: q.service,
                start_date: q.start_date,
                city: q.city,
                worker: q.worker,
                tasks: [],
            }));
    }, [quotes, acceptedQuoteIds]);

    const combinedItems = useMemo(() => {
        const projs = projects || [];
        return [...pendingQuotes, ...projs];
    }, [projects, pendingQuotes]);

    const filteredProjects = useMemo(() => {
        let result = combinedItems;

        if (filter === 'activos') {
            result = result.filter(p => !['completado', 'cancelado', 'rechazada'].includes(p.status));
        } else if (filter === 'completados') {
            result = result.filter(p => p.status === 'completado');
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                p.service?.name?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [combinedItems, filter, search]);

    return (
        <SafeAreaView className="flex-1 bg-background">

            {/* ── Header ── */}
            <View className="bg-surface border-b border-border px-5 pt-2 pb-2">

                {/* Title row */}
                <View className="flex-row items-center gap-3 pb-3">
                    <View className="flex-1">
                        <Text className="text-[18px] font-extrabold text-ink leading-tight">
                            Mis Proyectos
                        </Text>
                        <Text className="text-[12px] text-muted font-medium">
                            Gestión y seguimiento
                        </Text>
                    </View>
                </View>

                {/* Search */}
                <View className="flex-row items-center gap-2.5 bg-gray-50 border border-border rounded-2xl px-4 py-3 mb-3">
                    <Search size={17} color={ICON.muted} />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Buscar proyecto..."
                        placeholderTextColor="#9ca3af"
                        className="flex-1 text-[14px] font-medium text-ink"
                    />
                    {search.length > 0 && (
                        <IconButton
                            icon={X}
                            variant="ghost"
                            accessibilityLabel="Limpiar búsqueda"
                            onPress={() => setSearch('')}
                        />
                    )}
                </View>

                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-1">
                    {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'activos', label: 'En curso' },
                        { id: 'completados', label: 'Completados' },
                    ].map(f => {
                        const active = filter === f.id;
                        return (
                            <Button
                                key={f.id}
                                variant={active ? 'primary' : 'secondary'}
                                size="sm"
                                className="mr-2 !px-4 !py-2"
                                onPress={() => setFilter(f.id)}
                            >
                                {f.label}
                            </Button>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── List ── */}
            <ScrollView
                className="flex-1 px-5 pt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
            >
                {/* Loading */}
                {loading && [0, 1, 2].map(i => <CardSkeleton key={i} />)}

                {/* Error */}
                {error && <ErrorState message={error} onRetry={refetchProjects} />}

                {/* Empty (sin proyectos ni cotizaciones) */}
                {!loading && !error && combinedItems.length === 0 && (
                    <EmptyState
                        icon="📋"
                        title={isClient ? 'Sin proyectos aún' : 'Sin trabajos aún'}
                        subtitle={isClient
                            ? 'Cuando contrates un servicio o inicies un proyecto, aparecerá aquí.'
                            : 'Cuando un cliente acepte una de tus cotizaciones, el trabajo aparecerá aquí.'}
                        // La barra de tabs del trabajador no tiene ServicesTab
                        {...(isClient ? { action: 'Explorar servicios', onAction: () => navigation.navigate('ServicesTab') } : {})}
                    />
                )}

                {/* Sin resultados de búsqueda */}
                {!loading && !error && combinedItems.length > 0 && filteredProjects.length === 0 && (
                    <View className="items-center py-10">
                        <Text className="text-[14px] text-muted">
                            No hay proyectos que coincidan con la búsqueda.
                        </Text>
                    </View>
                )}

                {/* Cards */}
                {!loading && !error && filteredProjects.map(project => {
                    const isQuote = !!project._isQuote;

                    const tasks = project.tasks || [];
                    const done = tasks.filter(t => t.status === 'completada').length;
                    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

                    const isCompleted = project.status === 'completado';
                    const assignedWorker = isQuote ? project.worker : (project.worker || tasks.find(t => t.assignee)?.assignee);

                    return (
                        <Card
                            key={project.id}
                            padding="sm"
                            onPress={() => !isQuote && navigation.navigate('ProjectDetail', { id: project.id })}
                            accessibilityLabel={project.title}
                            className="mb-4"
                        >
                            {/* Card header */}
                            <View className="flex-row items-start justify-between gap-3 mb-3">
                                <View className="flex-1 min-w-0">
                                    {/* Status badge (+ aviso de pago pendiente, glanceable sin entrar al detalle) */}
                                    <View className="flex-row items-center gap-1.5 mb-2">
                                        <StatusBadge status={project.status} />
                                        {!isQuote && PRE_PROGRESS_STATUSES.includes(project.status) && (
                                            <View className="flex-row items-center gap-1 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                                                <Wallet size={10} color={RATING_COLOR} />
                                                <Text className="text-[10px] font-bold text-amber-700">Pago pendiente</Text>
                                            </View>
                                        )}
                                    </View>

                                    <Text className="font-extrabold text-[16px] text-ink" numberOfLines={1}>
                                        {project.title}
                                    </Text>
                                    <Text className="text-[13px] text-muted font-medium mt-0.5" numberOfLines={1}>
                                        {project.service?.name || 'Servicio'}
                                    </Text>
                                </View>

                                {!isQuote && (
                                    <View className="w-8 h-8 rounded-full bg-gray-50 border border-border items-center justify-center">
                                        <ChevronRight size={16} color={isCompleted ? ICON.muted : ICON.brand} />
                                    </View>
                                )}
                            </View>

                            {/* Date */}
                            {project.start_date && (
                                <View className="flex-row items-center gap-1.5 mb-3">
                                    <Calendar size={13} color={ICON.muted} />
                                    <Text className="text-[11px] font-medium text-muted">
                                        {formatDate(project.start_date)}
                                    </Text>
                                </View>
                            )}

                            {/* Quote: info del trabajador */}
                            {isQuote && project.status === 'solicitud_pendiente' && (
                                <View className="bg-violet-50 rounded-2xl px-3 py-2.5 border border-violet-100">
                                    <Text className="text-[11px] text-violet-600 font-medium">
                                        Esperando respuesta del profesional...
                                    </Text>
                                </View>
                            )}


                            {/* Progress bar — patrón canónico: track gris, fill brand en curso / success al completar */}
                            {!isQuote && tasks.length > 0 && (
                                <View>
                                    <View className="flex-row justify-between items-end mb-1.5">
                                        <Text className="text-[11px] font-bold text-muted">Progreso</Text>
                                        <Text className="text-[12px] font-extrabold text-ink">{pct}%</Text>
                                    </View>
                                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <View
                                            className={`h-full rounded-full ${pct >= 100 ? 'bg-success' : 'bg-brand'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </View>
                                    <Text className="text-[10px] text-muted mt-1.5 text-right font-medium">
                                        {done} de {tasks.length} completadas
                                    </Text>
                                </View>
                            )}

                            {/* Rate button (solo el cliente puede calificar al trabajador) */}
                            {!isQuote && isCompleted && assignedWorker && isClient && assignedWorker.id !== user?.id && (
                                <View className="mt-4 pt-3 border-t border-border">
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        accessibilityLabel={`Calificar a ${assignedWorker.name.split(' ')[0]}`}
                                        className="!bg-amber-50 !border-amber-100"
                                        onPress={() =>
                                            navigation.navigate('Rating', {
                                                projectId: project.id,
                                                workerId: assignedWorker.id,
                                                workerName: assignedWorker.name,
                                                workerAvatar: assignedWorker.avatar,
                                            })
                                        }
                                    >
                                        <View className="flex-row items-center gap-2">
                                            <Star size={15} color={RATING_COLOR} fill={RATING_COLOR} />
                                            <Text className="text-[13px] font-bold text-amber-600">
                                                Calificar a {assignedWorker.name.split(' ')[0]}
                                            </Text>
                                        </View>
                                    </Button>
                                </View>
                            )}
                        </Card>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}
