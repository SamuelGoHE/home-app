import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput,
    TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useAuthStore } from '../context/authStore';
import { useChat } from '../hooks/useChat';
import { useProjects } from '../hooks/useApi';

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

    const { messages, sendMessage, loading } = useChat(projectId, user?.id);

    const isClient = user?.role === 'cliente';
    let counterpartyName = 'Chat del Proyecto';
    if (project) {
        counterpartyName = isClient
            ? (project.worker?.name || project.tasks?.find(t => t.assignee)?.assignee?.name || 'Trabajador')
            : (project.client?.name || 'Cliente');
    }

    // Auto-scroll al llegar nuevos mensajes
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText.trim());
        setInputText('');
    };

    return (
        <SafeAreaView className="flex-1 bg-[#f8f9fb]" edges={['top']}>
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >

                {/* ── Header ── */}
                <View className="bg-white border-b border-gray-100 px-5 pt-2 pb-3 flex-row items-center gap-3 shadow-sm">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-9 h-9 items-center justify-center rounded-xl bg-gray-100"
                    >
                        <ArrowLeft size={18} color="#374151" />
                    </TouchableOpacity>

                    {/* Avatar inicial */}
                    <View className="w-9 h-9 rounded-full bg-[#E8432D] items-center justify-center">
                        <Text className="text-white font-extrabold text-[14px]">
                            {counterpartyName[0]?.toUpperCase() || '?'}
                        </Text>
                    </View>

                    <View className="flex-1">
                        <Text className="text-[15px] font-extrabold text-[#111]" numberOfLines={1}>
                            {counterpartyName}
                        </Text>
                        <Text className="text-[12px] text-gray-400 font-medium" numberOfLines={1}>
                            {project?.service?.name || 'Chat del Proyecto'}
                        </Text>
                    </View>
                </View>

                {/* ── Mensajes ── */}
                {loading ? (
                    <View className="flex-1 items-center justify-center gap-2">
                        <ActivityIndicator size="large" color="#E8432D" />
                        <Text className="text-[13px] text-gray-400 font-medium">Cargando historial...</Text>
                    </View>
                ) : messages.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8 gap-3">
                        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center">
                            <Text className="text-2xl">👋</Text>
                        </View>
                        <Text className="text-[16px] font-bold text-[#111]">Aún no hay mensajes</Text>
                        <Text className="text-[13px] text-gray-400 text-center leading-relaxed">
                            Escribe un mensaje para comenzar la conversación sobre este proyecto.
                        </Text>
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
                                        <Text className="text-[10px] font-bold text-gray-400 ml-2 mb-1">
                                            {msg.sender.name.split(' ')[0]}
                                        </Text>
                                    )}

                                    {/* Burbuja */}
                                    <View
                                        className={`px-4 py-3 rounded-2xl ${isMine
                                                ? 'bg-[#E8432D] rounded-br-sm'
                                                : 'bg-white border border-gray-100 rounded-bl-sm'
                                            }`}
                                        style={isMine
                                            ? { shadowColor: '#E8432D', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
                                            : { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }
                                        }
                                    >
                                        <Text
                                            className={`text-[14px] leading-snug ${isMine ? 'text-white' : 'text-[#111]'}`}
                                        >
                                            {msg.text}
                                        </Text>
                                    </View>

                                    {/* Hora */}
                                    <Text className={`text-[10px] text-gray-400 font-medium mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                                        {timeLabel}
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}

                {/* ── Input ── */}
                <View className="bg-white border-t border-gray-100 px-4 py-3">
                    <View className="flex-row items-center gap-2 bg-[#f8f9fb] rounded-full px-2 py-1.5 border border-gray-100">
                        <TextInput
                            value={inputText}
                            onChangeText={setInputText}
                            placeholder="Escribe un mensaje..."
                            placeholderTextColor="#9ca3af"
                            className="flex-1 px-3 text-[14px] text-[#111] max-h-24"
                            multiline
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                            className="w-10 h-10 rounded-full bg-[#E8432D] items-center justify-center flex-shrink-0"
                            style={{ opacity: inputText.trim() ? 1 : 0.4 }}
                        >
                            <Send size={16} color="#fff" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                    </View>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}