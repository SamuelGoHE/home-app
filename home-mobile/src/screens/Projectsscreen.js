import React, { useState, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, TextInput,
    TouchableOpacity, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, Search,
    ChevronRight, Calendar, Star,
    CheckCircle2, Clock, AlertCircle, Send,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useProjects, useMyQuotes } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatDate(d) {
    if (!d) return null;
    return format(new Date(d), "d MMM yyyy", { locale: es });
}

const STATUS_UI = {
    solicitud_pendiente: { label: 'Cotización enviada', textColor: '#7c3aed', bg: '#ede9fe', Icon: Send },
    rechazada:   { label: 'No disponible',   textColor: '#dc2626', bg: '#fee2e2', Icon: AlertCircle },
    pendiente:   { label: 'Pendiente',       textColor: '#4b5563', bg: '#f3f4f6', Icon: Clock },
    en_revision: { label: 'En revisión',     textColor: '#d97706', bg: '#fef3c7', Icon: AlertCircle },
    aprobado:    { label: 'Aprobado',        textColor: '#2563eb', bg: '#dbeafe', Icon: CheckCircle2 },
    en_progreso: { label: 'En progreso',     textColor: '#ea580c', bg: '#ffedd5', Icon: Clock },
    pausado:     { label: 'Pausado',         textColor: '#6b7280', bg: '#f3f4f6', Icon: AlertCircle },
    completado:  { label: 'Completado',      textColor: '#059669', bg: '#d1fae5', Icon: CheckCircle2 },
    cancelado:   { label: 'Cancelado',       textColor: '#dc2626', bg: '#fee2e2', Icon: AlertCircle },
};

/* ─── Skeleton card ──────────────────────────────────────────────── */
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
        <SafeAreaView className="flex-1 bg-[#f8f9fb]">

            {/* ── Header ── */}
            <View className="bg-white border-b border-gray-100 px-5 pt-2 pb-2">

                {/* Title row */}
                <View className="flex-row items-center gap-3 pb-3">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-9 h-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100"
                    >
                        <ArrowLeft size={18} color="#4b5563" />
                    </TouchableOpacity>

                    <View className="flex-1">
                        <Text className="text-[18px] font-extrabold text-[#111] leading-tight">
                            Mis Proyectos
                        </Text>
                        <Text className="text-[12px] text-gray-400 font-medium">
                            Gestión y seguimiento
                        </Text>
                    </View>
                </View>

                {/* Search */}
                <View className="flex-row items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 mb-3">
                    <Search size={17} color="#9ca3af" />
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Buscar proyecto..."
                        placeholderTextColor="#9ca3af"
                        className="flex-1 text-[14px] font-medium text-[#111]"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text className="text-gray-400 text-lg">×</Text>
                        </TouchableOpacity>
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
                            <TouchableOpacity
                                key={f.id}
                                onPress={() => setFilter(f.id)}
                                activeOpacity={0.85}
                                className="mr-2 px-4 py-2 rounded-2xl border"
                                style={{
                                    backgroundColor: active ? '#E8432D' : '#ffffff',
                                    borderColor:     active ? '#E8432D' : '#e5e7eb',
                                }}
                            >
                                <Text
                                    className="text-[13px] font-bold"
                                    style={{ color: active ? '#ffffff' : '#6b7280' }}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
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
                {error && (
                    <View className="items-center py-10 gap-3">
                        <Text className="text-[15px] text-gray-400">{error}</Text>
                        <TouchableOpacity onPress={refetchProjects} className="px-5 py-2.5 bg-[#E8432D] rounded-xl">
                            <Text className="text-white font-bold text-[14px]">Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Empty (sin proyectos ni cotizaciones) */}
                {!loading && !error && combinedItems.length === 0 && (
                    <View className="items-center py-16 gap-3">
                        <Text className="text-5xl">📋</Text>
                        <Text className="text-[17px] font-bold text-[#111]">
                            {isClient ? 'Sin proyectos aún' : 'Sin trabajos aún'}
                        </Text>
                        <Text className="text-[13px] text-gray-400 text-center px-6">
                            {isClient
                                ? 'Cuando contrates un servicio o inicies un proyecto, aparecerá aquí.'
                                : 'Cuando un cliente acepte una de tus cotizaciones, el trabajo aparecerá aquí.'}
                        </Text>
                        {/* La barra de tabs del trabajador no tiene ServicesTab */}
                        {isClient && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('ServicesTab')}
                                className="mt-2 px-6 py-3 bg-[#E8432D] rounded-2xl"
                            >
                                <Text className="text-white font-bold text-[14px]">Explorar servicios</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Sin resultados de búsqueda */}
                {!loading && !error && combinedItems.length > 0 && filteredProjects.length === 0 && (
                    <View className="items-center py-10">
                        <Text className="text-[14px] text-gray-400">
                            No hay proyectos que coincidan con la búsqueda.
                        </Text>
                    </View>
                )}

                {/* Cards */}
                {!loading && !error && filteredProjects.map(project => {
                    const statusDef = STATUS_UI[project.status] || STATUS_UI.pendiente;
                    const { Icon: StatusIcon } = statusDef;
                    const isQuote = !!project._isQuote;

                    const tasks = project.tasks || [];
                    const done = tasks.filter(t => t.status === 'completada').length;
                    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

                    const isCompleted = project.status === 'completado';
                    const assignedWorker = isQuote ? project.worker : tasks.find(t => t.assignee)?.assignee;

                    return (
                        <Pressable
                            key={project.id}
                            onPress={() => !isQuote && navigation.navigate('ProjectDetail', { id: project.id })}
                            className="bg-white rounded-3xl p-4 border border-gray-100 mb-4 active:scale-[.98]"
                            style={({ pressed }) => pressed && !isQuote && { opacity: 0.95 }}
                        >
                            {/* Card header */}
                            <View className="flex-row items-start justify-between gap-3 mb-3">
                                <View className="flex-1 min-w-0">
                                    {/* Status badge */}
                                    <View
                                        className="self-start flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg mb-2"
                                        style={{ backgroundColor: statusDef.bg }}
                                    >
                                        <StatusIcon size={12} color={statusDef.textColor} strokeWidth={2.5} />
                                        <Text
                                            className="text-[10px] font-extrabold uppercase tracking-wide"
                                            style={{ color: statusDef.textColor }}
                                        >
                                            {statusDef.label}
                                        </Text>
                                    </View>

                                    <Text className="font-extrabold text-[16px] text-[#111]" numberOfLines={1}>
                                        {project.title}
                                    </Text>
                                    <Text className="text-[13px] text-gray-500 font-medium mt-0.5" numberOfLines={1}>
                                        {project.service?.name || 'Servicio'}
                                    </Text>
                                </View>

                                {!isQuote && (
                                    <View className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 items-center justify-center">
                                        <ChevronRight size={16} color={isCompleted ? '#9ca3af' : '#E8432D'} />
                                    </View>
                                )}
                            </View>

                            {/* Date */}
                            {project.start_date && (
                                <View className="flex-row items-center gap-1.5 mb-3">
                                    <Calendar size={13} color="#9ca3af" />
                                    <Text className="text-[11px] font-medium text-gray-500">
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

                            {/* Progress bar (only for real projects with tasks) */}
                            {!isQuote && tasks.length > 0 && (
                                <View>
                                    <View className="flex-row justify-between items-end mb-1.5">
                                        <Text className="text-[11px] font-bold text-gray-500">Progreso</Text>
                                        <Text className="text-[12px] font-extrabold text-[#111]">{pct}%</Text>
                                    </View>
                                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <View
                                            className="h-full rounded-full bg-[#E8432D]"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </View>
                                    <Text className="text-[10px] text-gray-400 mt-1.5 text-right font-medium">
                                        {done} de {tasks.length} completadas
                                    </Text>
                                </View>
                            )}

                            {/* Rate button (solo el cliente puede calificar al trabajador) */}
                            {!isQuote && isCompleted && assignedWorker && isClient && assignedWorker.id !== user?.id && (
                                <View className="mt-4 pt-3 border-t border-gray-50">
                                    <TouchableOpacity
                                        onPress={() =>
                                            navigation.navigate('Rating', {
                                                projectId: project.id,
                                                workerId: assignedWorker.id,
                                                workerName: assignedWorker.name,
                                            })
                                        }
                                        className="w-full flex-row items-center justify-center gap-2 py-2.5 bg-amber-50 rounded-xl border border-amber-100"
                                    >
                                        <Star size={15} color="#f59e0b" fill="#f59e0b" />
                                        <Text className="text-[13px] font-bold text-amber-600">
                                            Calificar a {assignedWorker.name.split(' ')[0]}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}