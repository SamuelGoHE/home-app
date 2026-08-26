import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { useConversations } from '../hooks/useApi';
import { BackButton, LoadingState, EmptyState, ErrorState } from '../components/ui';

/**
 * Colores literales necesarios para el prop `color` de lucide-react-native
 * (los íconos SVG no aceptan clases de Tailwind). Mismo patrón que
 * Projectdetailscreen.js (piloto).
 */
const ICON = {
    muted: '#6b7280', // = tokens.colors.muted
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function formatLastMessageTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
        return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/* ══════════════════════════════════════════════════════════════════
   CHATS LIST SCREEN
══════════════════════════════════════════════════════════════════ */
export default function ChatsListScreen({ navigation }) {
    const { data: conversations, loading, error, refetch } = useConversations();

    const openChat = (projectId) => {
        navigation.navigate('ProjectsTab', {
            screen: 'Chat',
            params: { projectId },
        });
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* ── Header ── */}
            <View className="bg-surface border-b border-border px-5 pt-2 pb-3 flex-row items-center gap-3">
                <BackButton onPress={() => navigation.goBack()} />
                <Text className="text-[18px] font-extrabold text-ink">Mis chats</Text>
            </View>

            {loading ? (
                <LoadingState fullScreen />
            ) : error ? (
                <View className="flex-1 items-center justify-center px-10">
                    <ErrorState message={error} onRetry={refetch} />
                </View>
            ) : !conversations || conversations.length === 0 ? (
                <View className="flex-1 items-center justify-center px-10">
                    <EmptyState
                        icon={<MessageCircle size={20} color={ICON.muted} />}
                        title="Sin conversaciones aún"
                        subtitle="Cuando le escribas a un trabajador desde alguno de tus proyectos, la conversación aparecerá aquí."
                    />
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingVertical: 8 }}
                >
                    {conversations.map(c => (
                        <TouchableOpacity
                            key={c.project_id}
                            onPress={() => openChat(c.project_id)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Chat con ${c.counterpart?.name || 'usuario'}`}
                            className="flex-row items-center gap-3 px-5 py-3.5 bg-surface border-b border-border"
                        >
                            {/* Avatar */}
                            <View className="w-12 h-12 rounded-full bg-brand items-center justify-center flex-shrink-0 overflow-hidden">
                                {c.counterpart?.avatar ? (
                                    <Image source={{ uri: c.counterpart.avatar }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <Text className="text-white font-extrabold text-[16px]">
                                        {(c.counterpart?.name?.[0] || '?').toUpperCase()}
                                    </Text>
                                )}
                            </View>

                            <View className="flex-1 min-w-0">
                                <View className="flex-row items-center justify-between">
                                    <Text
                                        className={`text-[14px] flex-1 mr-2 ${c.unread_count > 0 ? 'font-extrabold text-ink' : 'font-bold text-ink'}`}
                                        numberOfLines={1}
                                    >
                                        {c.counterpart?.name || 'Usuario'}
                                    </Text>
                                    <Text className="text-[11px] text-muted flex-shrink-0">
                                        {formatLastMessageTime(c.last_message.created_at)}
                                    </Text>
                                </View>
                                <Text className="text-[11px] text-muted mt-0.5" numberOfLines={1}>
                                    {c.service?.name || c.project_title}
                                </Text>
                                <View className="flex-row items-center justify-between mt-1">
                                    <Text
                                        className={`text-[13px] flex-1 mr-2 ${c.unread_count > 0 ? 'font-semibold text-ink' : 'text-muted'}`}
                                        numberOfLines={1}
                                    >
                                        {c.last_message.text}
                                    </Text>
                                    {c.unread_count > 0 && (
                                        <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-brand items-center justify-center flex-shrink-0">
                                            <Text className="text-white text-[10px] font-extrabold">{c.unread_count}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
