import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TextInput,
    TouchableOpacity, Switch, Alert, Modal,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, Key, MapPin, EyeOff, Download,
    ShieldCheck, MonitorSmartphone, X, Eye,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuthStore } from '../context/authStore';

const STORAGE_KEY = 'home-security-settings';

async function loadSecuritySettings() {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        return raw
            ? JSON.parse(raw)
            : { locationEnabled: true, dataSharing: false, twoFactor: false };
    } catch {
        return { locationEnabled: true, dataSharing: false, twoFactor: false };
    }
}

/* ─── Section header ─────────────────────────────────────────────── */
function SectionTitle({ children }) {
    return (
        <Text className="text-[12px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
            {children}
        </Text>
    );
}

/* ─── Settings row ───────────────────────────────────────────────── */
function SettingRow({ icon: Icon, iconBg, iconColor, title, subtitle, onPress, right, borderBottom = true }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={!onPress && !right}
            activeOpacity={onPress ? 0.7 : 1}
            className={`flex-row items-center gap-4 px-4 py-4 ${borderBottom ? 'border-b border-gray-50' : ''}`}
        >
            <View className="w-9 h-9 rounded-2xl items-center justify-center flex-shrink-0"
                style={{ backgroundColor: iconBg }}>
                <Icon size={18} color={iconColor} />
            </View>
            <View className="flex-1">
                <Text className="font-semibold text-[15px] text-[#111] leading-tight">{title}</Text>
                {subtitle ? (
                    <Text className="text-[12px] text-gray-400 mt-0.5">{subtitle}</Text>
                ) : null}
            </View>
            {right ?? null}
        </TouchableOpacity>
    );
}

/* ══════════════════════════════════════════════════════════════════
   SECURITY SCREEN
══════════════════════════════════════════════════════════════════ */
export default function SecurityScreen({ navigation }) {
    const { user, logout } = useAuthStore();
    const [settings, setSettings] = useState({
        locationEnabled: true,
        dataSharing: false,
        twoFactor: false,
    });
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
    const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
    const [pwdLoading, setPwdLoading] = useState(false);

    const isOAuth = user?.oauth_provider && user.oauth_provider !== 'local';

    useEffect(() => {
        loadSecuritySettings().then(setSettings);
    }, []);

    const handleToggle = async (key) => {
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    };

    const handleChangePwd = async () => {
        if (!pwdForm.current || !pwdForm.new || !pwdForm.confirm) {
            Alert.alert('Campos incompletos', 'Llena todos los campos.');
            return;
        }
        if (pwdForm.new.length < 8) {
            Alert.alert('Contraseña muy corta', 'Debe tener al menos 8 caracteres.');
            return;
        }
        if (pwdForm.new !== pwdForm.confirm) {
            Alert.alert('Error', 'Las contraseñas nuevas no coinciden.');
            return;
        }

        setPwdLoading(true);
        try {
            await api.patch('/users/me/password', {
                currentPassword: pwdForm.current,
                newPassword: pwdForm.new,
            });
            setShowPwdModal(false);
            setPwdForm({ current: '', new: '', confirm: '' });
            Alert.alert(
                '¡Contraseña actualizada!',
                'Por seguridad, inicia sesión nuevamente.',
                [{ text: 'Aceptar', onPress: () => logout() }],
                { cancelable: false }
            );
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'No se pudo actualizar la contraseña.');
        } finally {
            setPwdLoading(false);
        }
    };

    const handleDownloadData = () => {
        Alert.alert(
            'Solicitud recibida 📥',
            'Tu archivo de datos está siendo preparado. Te llegará al correo en 24h.',
            [{ text: 'Entendido' }]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#f8f9fb]">

            {/* ── Header ── */}
            <View className="bg-white border-b border-gray-100 px-5 pt-2 pb-4 flex-row items-center gap-3">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-9 h-9 items-center justify-center rounded-xl bg-gray-100"
                >
                    <ArrowLeft size={18} color="#374151" />
                </TouchableOpacity>
                <Text className="text-[17px] font-extrabold text-[#111]">Seguridad y privacidad</Text>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >

                {/* ── Seguridad de la Cuenta ── */}
                <SectionTitle>Seguridad de la Cuenta</SectionTitle>
                <View className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-5">
                    {!isOAuth && (
                        <SettingRow
                            icon={Key}
                            iconBg="#eef2ff"
                            iconColor="#6366f1"
                            title="Cambiar contraseña"
                            subtitle="Recomendado cada 3 meses"
                            onPress={() => setShowPwdModal(true)}
                        />
                    )}

                    <SettingRow
                        icon={ShieldCheck}
                        iconBg="#d1fae5"
                        iconColor="#059669"
                        title="Autenticación (2FA)"
                        subtitle="Seguridad adicional por SMS"
                        right={
                            <Switch
                                value={settings.twoFactor}
                                onValueChange={() => handleToggle('twoFactor')}
                                trackColor={{ false: '#e5e7eb', true: '#E8432D' }}
                                thumbColor="#fff"
                            />
                        }
                    />

                    <SettingRow
                        icon={MonitorSmartphone}
                        iconBg="#dbeafe"
                        iconColor="#2563eb"
                        title="Dispositivos vinculados"
                        subtitle={`1 sesión activa en ${user?.city || 'tu ciudad'}`}
                        borderBottom={false}
                    />
                </View>

                {/* ── Privacidad y Permisos ── */}
                <SectionTitle>Privacidad y Permisos</SectionTitle>
                <View className="bg-white rounded-3xl border border-gray-100 overflow-hidden mb-5">
                    <SettingRow
                        icon={MapPin}
                        iconBg="#fee2e2"
                        iconColor="#E8432D"
                        title="Acceso a ubicación"
                        subtitle="Para sugerir servicios cercanos"
                        right={
                            <Switch
                                value={settings.locationEnabled}
                                onValueChange={() => handleToggle('locationEnabled')}
                                trackColor={{ false: '#e5e7eb', true: '#E8432D' }}
                                thumbColor="#fff"
                            />
                        }
                    />
                    <SettingRow
                        icon={EyeOff}
                        iconBg="#f3f4f6"
                        iconColor="#6b7280"
                        title="Compartir estadísticas"
                        subtitle="Mejorar el servicio de forma anónima"
                        borderBottom={false}
                        right={
                            <Switch
                                value={settings.dataSharing}
                                onValueChange={() => handleToggle('dataSharing')}
                                trackColor={{ false: '#e5e7eb', true: '#E8432D' }}
                                thumbColor="#fff"
                            />
                        }
                    />
                </View>

                {/* ── Gestión de Datos ── */}
                <SectionTitle>Gestión de Datos</SectionTitle>
                <TouchableOpacity
                    onPress={handleDownloadData}
                    className="bg-white rounded-3xl border border-gray-100 flex-row items-center gap-4 px-5 py-4"
                    style={{
                        shadowColor: '#000',
                        shadowOpacity: 0.03,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                    }}
                >
                    <View className="w-9 h-9 rounded-2xl items-center justify-center bg-amber-50">
                        <Download size={18} color="#d97706" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-[15px] text-[#111] leading-tight">Descargar mis datos</Text>
                        <Text className="text-[12px] text-gray-400 mt-0.5 font-medium">
                            Obtén una copia de todo tu historial
                        </Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>

            {/* ══ Modal cambiar contraseña ══ */}
            <Modal
                visible={showPwdModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPwdModal(false)}
            >
                <KeyboardAvoidingView
                    className="flex-1"
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        className="flex-1 bg-black/40"
                        activeOpacity={1}
                        onPress={() => setShowPwdModal(false)}
                    />
                    <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
                        {/* Modal header */}
                        <View className="flex-row items-center justify-between mb-5">
                            <Text className="text-[18px] font-extrabold text-[#111]">Cambiar contraseña</Text>
                            <TouchableOpacity
                                onPress={() => setShowPwdModal(false)}
                                className="w-7 h-7 items-center justify-center rounded-full bg-gray-100"
                            >
                                <X size={16} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Fields */}
                        {[
                            { key: 'current', label: 'Contraseña actual' },
                            { key: 'new', label: 'Nueva contraseña' },
                            { key: 'confirm', label: 'Confirmar nueva' },
                        ].map(({ key, label }) => (
                            <View key={key} className="mb-4">
                                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    {label}
                                </Text>
                                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                                    <TextInput
                                        value={pwdForm[key]}
                                        onChangeText={v => setPwdForm(f => ({ ...f, [key]: v }))}
                                        secureTextEntry={!showPwd[key]}
                                        placeholder="••••••••"
                                        placeholderTextColor="#9ca3af"
                                        className="flex-1 text-[14px] font-medium text-[#111]"
                                    />
                                    <TouchableOpacity onPress={() => setShowPwd(s => ({ ...s, [key]: !s[key] }))}>
                                        {showPwd[key]
                                            ? <EyeOff size={18} color="#9ca3af" />
                                            : <Eye size={18} color="#9ca3af" />
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={handleChangePwd}
                            disabled={pwdLoading}
                            className="w-full mt-2 py-4 bg-[#E8432D] rounded-xl items-center"
                            style={{ opacity: pwdLoading ? 0.6 : 1 }}
                        >
                            <Text className="text-white font-bold text-[15px]">
                                {pwdLoading ? 'Guardando...' : 'Guardar cambios'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}