import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput,
    KeyboardAvoidingView,
    Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import { useChat } from '../hooks/useChat';
import { useProjects } from '../hooks/useApi';
import api from '../services/api';
import { BackButton, IconButton, LoadingState, EmptyState, ErrorState } from '../components/ui';

/**
 * Colores literales necesarios para props `color`/`iconColor`/`shadowColor`
 * de lucide-react-native y del sistema de sombras nativo (no aceptan clases
 * de Tailwind). Mismo patrón que Projectdetailscreen.js (piloto).
 */
const ICON = {
    brand: '#E8432D',   // = tokens.colors.brand.DEFAULT
    surface: '#ffffff', // = tokens.colors.surface.DEFAULT
};

/* ══════════════════════════════════════════════════════════════════
   CHAT SCREEN
   Params: { projectId }
══════════════════════════════════════════════════════════════════ */
export default function ChatScreen({ route, navigation }) {
    const { projectId } = route.params || {};
    const { user } = useAuthStore();

    const [inputText, setInputText] = useState('');
    const scrollRef = useRef(null);

    const { data: projects } = useProjects();
    const project = projects?.find(p => String(p.id) === String(projectId));

    const { messages, sendMessage, loading, error, refetch } = useChat(projectId, user?.id);

    const isClient = user?.role === 'cliente';
    let counterpartyName = 'Chat del Proyecto';
    let counterpartyAvatar = null;
    if (project) {
        const assignee = project.tasks?.find(t => t.assignee)?.assignee;
        counterpartyName = isClient
            ? (project.worker?.name || assignee?.name || 'Trabajador')
            : (project.client?.name || 'Cliente');
        counterpartyAvatar = isClient
            ? (project.worker?.avatar || assignee?.avatar)
            : project.client?.avatar;
    }

    // Auto-scroll al llegar nuevos mensajes
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    // Marcar como leídos los mensajes de la contraparte al abrir el chat
    useEffect(() => {
        if (!projectId) return;
        api.patch(`/messages/${projectId}/read`).catch(() => { });
    }, [projectId]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText.trim());
        setInputText('');
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >

                {/* ── Header ── */}
                <View className="bg-surface border-b border-border px-5 pt-2 pb-3 flex-row items-center gap-3 shadow-sm">
                    <BackButton onPress={() => navigation.goBack()} />

                    {/* Avatar */}
                    <View className="w-9 h-9 rounded-full bg-brand items-center justify-center overflow-hidden">
                        {counterpartyAvatar ? (
                            <Image source={{ uri: counterpartyAvatar }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <Text className="text-white font-extrabold text-[14px]">
                                {counterpartyName[0]?.toUpperCase() || '?'}
                            </Text>
                        )}
                    </View>

                    <View className="flex-1">
                        <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>
                            {counterpartyName}
                        </Text>
                        <Text className="text-[12px] text-muted font-medium" numberOfLines={1}>
                            {project?.service?.name || 'Chat del Proyecto'}
                        </Text>
                    </View>
                </View>

                {/* ── Mensajes ── */}
                {loading ? (
                    <LoadingState fullScreen message="Cargando historial..." />
                ) : error ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <ErrorState message={error} onRetry={refetch} />
                    </View>
                ) : messages.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <EmptyState
                            icon="👋"
                            title="Aún no hay mensajes"
                            subtitle="Escribe un mensaje para comenzar la conversación sobre este proyecto."
                        />
                    </View>
                ) : (
                    <ScrollView
                        ref={scrollRef}
                        className="flex-1 px-4"
                        contentContainerStyle={{ paddingTop: 20, paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.map((msg, idx) => {
                            const senderId = msg.senderId || msg.sender_id;
                            const isMine = String(senderId) === String(user?.id);
                            const timeLabel = new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit',
                            });

                            return (
                                <View
                                    key={msg.id || idx}
                                    className={`mb-4 max-w-[85%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}
                                >
                                    {/* Nombre remitente (solo mensajes ajenos) */}
                                    {!isMine && msg.sender?.name && (
                                        <Text className="text-[10px] font-bold text-muted ml-2 mb-1">
                                            {msg.sender.name.split(' ')[0]}
                                        </Text>
                                    )}

                                    {/* Burbuja */}
                                    <View
                                        className={`px-4 py-3 rounded-2xl ${isMine
                                                ? 'bg-brand rounded-br-sm'
                                                : 'bg-surface border border-border rounded-bl-sm'
                                            }`}
                                        style={isMine
                                            ? { shadowColor: ICON.brand, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
                                            : { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }
                                        }
                                    >
                                        <Text
                                            className={`text-[14px] leading-snug ${isMine ? 'text-white' : 'text-ink'}`}
                                        >
                                            {msg.text}
                                        </Text>
                                    </View>

                                    {/* Hora */}
                                    <Text className={`text-[10px] text-muted font-medium mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                                        {timeLabel}
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}

                {/* ── Input ── */}
                <View className="bg-surface border-t border-border px-4 py-3">
                    <View className="flex-row items-center gap-2 bg-background rounded-full px-2 py-1.5 border border-border">
                        <TextInput
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor="#9ca3af"
                            className="flex-1 px-3 text-[14px] text-ink max-h-24"
                            multiline
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                        />
                        <IconButton
                            icon={Send}
                            variant="solid"
                            className="!bg-brand !border-brand"
                            iconColor={ICON.surface}
                            disabled={!inputText.trim()}
                            accessibilityLabel="Enviar mensaje"
                            onPress={handleSend}
                        />
                    </View>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}