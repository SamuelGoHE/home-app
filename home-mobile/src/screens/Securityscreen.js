import React, { useState } from 'react';
import {
    View, Text, ScrollView, TextInput,
    TouchableOpacity, Alert, Modal,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Key, X, Eye, EyeOff,
} from 'lucide-react-native';
import api from '../services/api';
import { useAuthStore } from '../context/authStore';
import { Button, IconButton, BackButton, Card } from '../components/ui';

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
                <Text className="font-semibold text-[15px] text-ink leading-tight">{title}</Text>
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

   Nota: esta pantalla solía incluir toggles de 2FA, acceso a ubicación,
   compartir estadísticas, "descargar mis datos" y un contador de
   "dispositivos vinculados" — ninguno tenía respaldo real en el backend
   (guardaban un booleano local o mostraban un número inventado). Se
   quitaron en la auditoría de 2026-08-22 para no hacerle creer al usuario
   que activó una protección real cuando no ocurría nada en el servidor.
   Solo queda el cambio de contraseña, que sí llama a /users/me/password.
══════════════════════════════════════════════════════════════════ */
export default function SecurityScreen({ navigation }) {
    const { user, logout } = useAuthStore();
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' });
    const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
    const [pwdLoading, setPwdLoading] = useState(false);

    const isOAuth = user?.oauth_provider && user.oauth_provider !== 'local';

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

    return (
        <SafeAreaView className="flex-1 bg-background">

            {/* ── Header ── */}
            <View className="bg-surface border-b border-gray-100 px-5 pt-2 pb-4 flex-row items-center gap-3">
                <BackButton onPress={() => navigation.goBack()} />
                <Text className="text-[17px] font-extrabold text-ink">Seguridad y privacidad</Text>
            </View>

            <ScrollView
                className="flex-1 px-4 pt-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                <SectionTitle>Seguridad de la Cuenta</SectionTitle>
                {isOAuth ? (
                    <Card padding="md" className="mb-5">
                        <Text className="text-[13px] text-gray-500 leading-relaxed">
                            Tu cuenta está vinculada con {user.oauth_provider === 'google' ? 'Google' : user.oauth_provider === 'apple' ? 'Apple' : user.oauth_provider}.
                            La contraseña se gestiona desde tu proveedor, no desde HOME.
                        </Text>
                    </Card>
                ) : (
                    <Card padding="none" className="overflow-hidden mb-5">
                        <SettingRow
                            icon={Key}
                            iconBg="#eef2ff"
                            iconColor="#6366f1"
                            title="Cambiar contraseña"
                            subtitle="Recomendado cada 3 meses"
                            onPress={() => setShowPwdModal(true)}
                            borderBottom={false}
                        />
                    </Card>
                )}
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
                    <View className="bg-surface rounded-t-3xl px-6 pt-6 pb-10">
                        {/* Modal header */}
                        <View className="flex-row items-center justify-between mb-5">
                            <Text className="text-[18px] font-extrabold text-ink">Cambiar contraseña</Text>
                            <IconButton icon={X} accessibilityLabel="Cerrar" onPress={() => setShowPwdModal(false)} />
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
                                        className="flex-1 text-[14px] font-medium text-ink"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPwd(s => ({ ...s, [key]: !s[key] }))}
                                        accessibilityRole="button"
                                        accessibilityLabel={showPwd[key] ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
                                    >
                                        {showPwd[key]
                                            ? <EyeOff size={18} color="#9ca3af" />
                                            : <Eye size={18} color="#9ca3af" />
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <Button
                            variant="primary"
                            fullWidth
                            loading={pwdLoading}
                            onPress={handleChangePwd}
                            accessibilityLabel="Guardar cambios"
                            className="mt-2"
                        >
                            Guardar cambios
                        </Button>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}
