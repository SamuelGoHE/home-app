import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, Calendar, MapPin, MessageCircle,
    CheckCircle2, Clock, AlertCircle, Star,
    Check, ChevronRight,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProject } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import api from '../services/api';

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatDate(d) {
    if (!d) return 'Sin fecha asignada';
    return format(new Date(d), "d MMM yyyy", { locale: es });
}

const STATUS_UI = {
    pendiente: { label: 'Pendiente', textColor: '#4b5563', bg: '#f3f4f6', Icon: Clock },
    en_revision: { label: 'En revisión', textColor: '#d97706', bg: '#fef3c7', Icon: AlertCircle },
    aprobado: { label: 'Aprobado', textColor: '#2563eb', bg: '#dbeafe', Icon: CheckCircle2 },
    en_progreso: { label: 'En progreso', textColor: '#ea580c', bg: '#ffedd5', Icon: Clock },
    pausado: { label: 'Pausado', textColor: '#6b7280', bg: '#f3f4f6', Icon: AlertCircle },
    completado: { label: 'Completado', textColor: '#059669', bg: '#d1fae5', Icon: CheckCircle2 },
    cancelado: { label: 'Cancelado', textColor: '#dc2626', bg: '#fee2e2', Icon: AlertCircle },
    completada: { label: 'Completada', textColor: '#059669', bg: '#d1fae5', Icon: CheckCircle2 },
};

const PRIORITY_DOT = {
    baja: '#9ca3af',
    media: '#3b82f6',
    alta: '#f97316',
    urgente: '#ef4444',
};

/* ─── Section card wrapper ───────────────────────────────────────── */
function Section({ children, className = '' }) {
    return (
        <View className={`bg-white rounded-2xl border border-gray-100 p-4 ${className}`}>
            {children}
        </View>
    );
}

/* ─── Info row ───────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <View className="flex-row items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
            <View className="w-7 h-7 rounded-xl bg-gray-50 items-center justify-center">
                <Icon size={14} color="#9ca3af" />
            </View>
            <View className="flex-1">
                <Text className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{label}</Text>
                <Text className="text-[14px] text-[#111] font-semibold mt-0.5">{value}</Text>
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
    const [updating, setUpdating] = useState(false);

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

    const statusDef = project ? (STATUS_UI[project.status] || STATUS_UI.pendiente) : STATUS_UI.pendiente;
    const { Icon: StatusIcon } = statusDef;

    const assignedWorker = tasks.find(t => t.assignee)?.assignee;
    const isCompleted = project?.status === 'completado';

    /* ── Worker action button ── */
    const workerAction = () => {
        if (user?.role !== 'trabajador' || !project) return null;
        if (project.status === 'pendiente')
            return { label: 'Comenzar trabajo', status: 'en_revision' };
        if (['en_revision', 'aprobado', 'pausado'].includes(project.status))
            return { label: 'Continuar progreso', status: 'en_progreso' };
        if (project.status === 'en_progreso')
            return { label: 'Marcar como completado', status: 'completado' };
        return null;
    };
    const action = workerAction();

    const handleUpdateStatus = async (newStatus) => {
        if (updating) return;
        Alert.alert(
            'Confirmar cambio',
            `¿Cambiar estado a "${STATUS_UI[newStatus]?.label}"?`,
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

    /* ── Loading ── */
    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-[#f8f9fb]">
                <ActivityIndicator size="large" color="#E8432D" />
            </View>
        );
    }

    /* ── Error ── */
    if (error) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#f8f9fb] gap-4 px-8">
                <Text className="text-[15px] text-gray-400 text-center">{error}</Text>
                <TouchableOpacity onPress={refetch} className="px-6 py-3 bg-[#E8432D] rounded-2xl">
                    <Text className="text-white font-bold">Reintentar</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    /* ── Not found ── */
    if (!project) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-[#f8f9fb] gap-3">
                <Text className="text-[15px] text-gray-400">Proyecto no encontrado</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text className="text-[#E8432D] font-semibold">Volver</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    /* ── Main render ── */
    return (
        <SafeAreaView className="flex-1 bg-[#f8f9fb]">

            {/* ── Sticky header ── */}
            <View className="bg-white border-b border-gray-100 px-5 pt-2 pb-3 flex-row items-center gap-3">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-9 h-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100"
                >
                    <ArrowLeft size={18} color="#4b5563" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-[16px] font-extrabold text-[#111]" numberOfLines={1}>
                        {project.title}
                    </Text>
                    <Text className="text-[12px] text-gray-400 font-medium" numberOfLines={1}>
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
                <Section>
                    {/* Status badge */}
                    <View
                        className="self-start flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl mb-3"
                        style={{ backgroundColor: statusDef.bg }}
                    >
                        <StatusIcon size={13} color={statusDef.textColor} strokeWidth={2.5} />
                        <Text className="text-[11px] font-extrabold uppercase tracking-wide"
                            style={{ color: statusDef.textColor }}>
                            {statusDef.label}
                        </Text>
                    </View>

                    <Text className="text-[20px] font-extrabold text-[#111] mb-0.5">
                        {project.title}
                    </Text>
                    <Text className="text-[13px] text-gray-500 font-medium mb-4">
                        {project.service?.name}
                    </Text>

                    {/* Progress bar */}
                    {tasks.length > 0 && (
                        <View>
                            <View className="flex-row justify-between items-end mb-2">
                                <Text className="text-[12px] font-bold text-gray-500">Progreso general</Text>
                                <Text className="text-[14px] font-extrabold text-[#111]">{pct}%</Text>
                            </View>
                            <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <View
                                    className="h-full rounded-full bg-[#E8432D]"
                                    style={{ width: `${pct}%` }}
                                />
                            </View>
                            <Text className="text-[11px] text-gray-400 mt-2 text-right font-medium">
                                {done} de {tasks.length} tareas completadas
                            </Text>
                        </View>
                    )}
                </Section>

                {/* ── Worker action ── */}
                {action && (
                    <TouchableOpacity
                        disabled={updating}
                        onPress={() => handleUpdateStatus(action.status)}
                        className="w-full py-4 bg-[#E8432D] rounded-2xl items-center"
                        style={{ opacity: updating ? 0.7 : 1 }}
                    >
                        {updating
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text className="text-white font-extrabold text-[15px]">{action.label}</Text>
                        }
                    </TouchableOpacity>
                )}

                {/* ── Detalles del proyecto ── */}
                <Section>
                    <Text className="text-[13px] font-extrabold text-[#111] mb-1">Detalles</Text>
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
                </Section>

                {/* ── Contacto (cliente ↔ trabajador) ── */}
                {(assignedWorker || project.client) && (
                    <Section>
                        <Text className="text-[13px] font-extrabold text-[#111] mb-3">
                            {user?.role === 'trabajador' ? 'Cliente' : 'Trabajador asignado'}
                        </Text>

                        <View className="flex-row items-center gap-3">
                            {/* Avatar inicial */}
                            <View className="w-11 h-11 rounded-full bg-[#E8432D] items-center justify-center">
                                <Text className="text-white font-extrabold text-[16px]">
                                    {(user?.role === 'trabajador'
                                        ? project.client?.name
                                        : assignedWorker?.name
                                    )?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>

                            <View className="flex-1">
                                <Text className="text-[15px] font-extrabold text-[#111]">
                                    {user?.role === 'trabajador'
                                        ? project.client?.name
                                        : (assignedWorker?.name || 'Sin asignar')}
                                </Text>
                                {!assignedWorker && user?.role !== 'trabajador' && (
                                    <Text className="text-[12px] text-gray-400">Pendiente de asignación</Text>
                                )}
                            </View>

                            {/* Chat button */}
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Chat', { projectId: project.id })}
                                className="w-10 h-10 rounded-xl bg-[#E8432D]/10 items-center justify-center"
                            >
                                <MessageCircle size={18} color="#E8432D" />
                            </TouchableOpacity>
                        </View>
                    </Section>
                )}

                {/* ── Tareas ── */}
                <Section>
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-[13px] font-extrabold text-[#111]">
                            Tareas
                        </Text>
                        <Text className="text-[12px] font-bold text-gray-400">
                            {done}/{tasks.length}
                        </Text>
                    </View>

                    {tasks.length === 0 ? (
                        <Text className="text-[13px] text-gray-400 text-center py-4">
                            No hay tareas para este proyecto.
                        </Text>
                    ) : (
                        <View className="gap-2">
                            {tasks.map(task => {
                                const tDef = STATUS_UI[task.status] || STATUS_UI.pendiente;
                                const isTaskDone = task.status === 'completada';
                                const dotColor = PRIORITY_DOT[task.priority] || PRIORITY_DOT.media;

                                return (
                                    <View
                                        key={task.id}
                                        className="flex-row items-start gap-3 p-3 bg-gray-50 rounded-xl"
                                    >
                                        {/* Checkbox visual */}
                                        <View className={`w-5 h-5 rounded-full mt-0.5 items-center justify-center border ${isTaskDone
                                                ? 'bg-emerald-500 border-emerald-500'
                                                : 'border-gray-300 bg-white'
                                            }`}>
                                            {isTaskDone && <Check size={11} color="#fff" strokeWidth={3} />}
                                        </View>

                                        {/* Task info */}
                                        <View className="flex-1">
                                            <Text
                                                className={`text-[14px] font-semibold ${isTaskDone ? 'text-gray-400 line-through' : 'text-[#111]'
                                                    }`}
                                                numberOfLines={2}
                                            >
                                                {task.title}
                                            </Text>

                                            <View className="flex-row items-center gap-2 mt-1.5">
                                                {/* Status chip */}
                                                <View
                                                    className="px-2 py-0.5 rounded-md"
                                                    style={{ backgroundColor: tDef.bg }}
                                                >
                                                    <Text className="text-[10px] font-bold" style={{ color: tDef.textColor }}>
                                                        {tDef.label}
                                                    </Text>
                                                </View>

                                                {/* Priority dot */}
                                                {task.priority && (
                                                    <View className="flex-row items-center gap-1">
                                                        <View
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: dotColor }}
                                                        />
                                                        <Text className="text-[10px] text-gray-400 capitalize">
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
                </Section>

                {/* ── Calificar (cliente, proyecto completado) ── */}
                {isCompleted && assignedWorker && user?.role === 'cliente' && (
                    <TouchableOpacity
                        onPress={() =>
                            navigation.navigate('Rating', {
                                projectId: project.id,
                                workerId: assignedWorker.id,
                                workerName: assignedWorker.name,
                            })
                        }
                        className="w-full flex-row items-center justify-center gap-2.5 py-4 bg-amber-50 rounded-2xl border border-amber-100"
                    >
                        <Star size={18} color="#f59e0b" fill="#f59e0b" />
                        <Text className="text-[14px] font-extrabold text-amber-600">
                            Calificar a {assignedWorker.name.split(' ')[0]}
                        </Text>
                    </TouchableOpacity>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}