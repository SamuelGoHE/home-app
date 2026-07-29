import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, Globe, Bell, Mail, Trash2, Check, X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'home-settings';

const DEFAULT_SETTINGS = {
    language: 'es',
    pushEnabled: true,
    emailEnabled: false,
};

const LANGUAGES = [
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' },
];

/* ─── Toggle Switch estilo iOS ──────────────────────────────────── */
function ToggleSwitch({ checked, onChange }) {
    return (
        <TouchableOpacity
            onPress={onChange}
            className={`w-12 h-6 rounded-full relative ${checked ? 'bg-[#E8432D]' : 'bg-gray-200'}`}
            activeOpacity={0.8}
        >
            <View
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm`}
                style={{ transform: [{ translateX: checked ? 26 : 2 }] }}
            />
        </TouchableOpacity>
    );
}

/* ── Fila de opción ───────────────────────────────────────────────── */
function OptionRow({ icon: Icon, iconColor, bg, label, sublabel, right }) {
    return (
        <View className="flex-row items-center gap-4 px-4 py-4 border-b border-gray-50 last:border-0">
            <View className="w-9 h-9 rounded-2xl items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                <Icon size={18} color={iconColor} />
            </View>
            <View className="flex-1">
                <Text className="font-semibold text-[15px] text-[#111]">{label}</Text>
                {sublabel && <Text className="text-[12px] text-gray-400 mt-0.5">{sublabel}</Text>}
            </View>
            {right}
        </View>
    );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
export default function AppSettingsScreen({ navigation }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [showLangModal, setShowLangModal] = useState(false);

    // Cargar ajustes guardados
    useEffect(() => {
        AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
            if (raw) {
                try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch { }
            }
        });
    }, []);

    // Guardar cuando cambian
    useEffect(() => {
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    const update = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
    const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

    const currentLangLabel = LANGUAGES.find((l) => l.code === settings.language)?.label || 'Español';

    const handleDeleteAccount = () => {
        Alert.alert(
            'Eliminar cuenta',
            'La eliminación de cuenta está deshabilitada en esta versión de demostración.',
            [{ text: 'Entendido', style: 'cancel' }]
        );
    };

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
                <Text className="font-extrabold text-[17px] text-[#111]">Configuración</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Preferencias */}
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
                    Preferencias
                </Text>
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    {/* Idioma */}
                    <TouchableOpacity
                        className="flex-row items-center gap-4 px-4 py-4 border-b border-gray-50 active:bg-gray-50"
                        onPress={() => setShowLangModal(true)}
                        activeOpacity={0.75}
                    >
                        <View className="w-9 h-9 rounded-2xl items-center justify-center bg-blue-50">
                            <Globe size={18} color="#3b82f6" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-semibold text-[15px] text-[#111]">Idioma</Text>
                        </View>
                        <Text className="text-[14px] text-gray-500 font-medium mr-1">{currentLangLabel}</Text>
                    </TouchableOpacity>
                </View>

                {/* Notificaciones */}
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
                    Notificaciones
                </Text>
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <OptionRow
                        icon={Bell}
                        iconColor="#f97316"
                        bg="#fff7ed"
                        label="Notificaciones push"
                        sublabel="Alertas de proyectos y cotizaciones"
                        right={<ToggleSwitch checked={settings.pushEnabled} onChange={() => toggle('pushEnabled')} />}
                    />
                    <OptionRow
                        icon={Mail}
                        iconColor="#6366f1"
                        bg="#eef2ff"
                        label="Correos de novedades"
                        sublabel="Actualizaciones y promociones"
                        right={<ToggleSwitch checked={settings.emailEnabled} onChange={() => toggle('emailEnabled')} />}
                    />
                </View>

                {/* Zona peligrosa */}
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
                    Zona de riesgo
                </Text>
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <TouchableOpacity
                        onPress={handleDeleteAccount}
                        className="flex-row items-center gap-4 px-4 py-4 active:bg-red-50"
                        activeOpacity={0.75}
                    >
                        <View className="w-9 h-9 rounded-2xl items-center justify-center bg-red-50">
                            <Trash2 size={18} color="#ef4444" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-semibold text-[15px] text-red-500">Eliminar mi cuenta</Text>
                            <Text className="text-[12px] text-gray-400 mt-0.5">Esta acción no se puede deshacer</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Modal de idioma */}
            <Modal visible={showLangModal} transparent animationType="slide">
                <View className="flex-1 justify-end bg-black/40">
                    <TouchableOpacity className="flex-1" onPress={() => setShowLangModal(false)} />
                    <View className="bg-white rounded-t-3xl p-6 pb-10">
                        <View className="flex-row justify-between items-center mb-5">
                            <Text className="text-[18px] font-extrabold text-[#111]">Seleccionar idioma</Text>
                            <TouchableOpacity
                                onPress={() => setShowLangModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                            >
                                <X size={16} color="#4b5563" />
                            </TouchableOpacity>
                        </View>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                onPress={() => { update('language', lang.code); setShowLangModal(false); }}
                                className="flex-row items-center justify-between py-4 border-b border-gray-50 last:border-0"
                            >
                                <Text className={`text-[16px] font-bold ${settings.language === lang.code ? 'text-[#E8432D]' : 'text-[#111]'}`}>
                                    {lang.label}
                                </Text>
                                {settings.language === lang.code && <Check size={18} color="#E8432D" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}