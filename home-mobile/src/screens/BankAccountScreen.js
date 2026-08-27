import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, Clock } from 'lucide-react-native';
import { usePayoutAccount } from '../hooks/useApi';
import api from '../services/api';
import { BackButton, Card, Button, Input, LoadingState } from '../components/ui';

const ACCOUNT_TYPES = [
    { key: 'ahorros', label: 'Ahorros' },
    { key: 'corriente', label: 'Corriente' },
];

export default function BankAccountScreen({ navigation }) {
    const { data: account, loading, refetch } = usePayoutAccount();
    const [form, setForm] = useState({ bank_name: '', account_type: 'ahorros', account_number: '', account_holder_id_number: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (account) {
            setForm(f => ({ ...f, bank_name: account.bank_name, account_type: account.account_type, account_holder_id_number: account.account_holder_id_number }));
        }
    }, [account]);

    const canSubmit = form.bank_name.trim() && form.account_type && form.account_number.trim() && form.account_holder_id_number.trim();

    const handleSave = async () => {
        if (!canSubmit || saving) return;
        setSaving(true);
        try {
            await api.post('/users/me/payout-account', form);
            Alert.alert('Listo', 'Tu cuenta bancaria quedó registrada y pendiente de verificación.');
            setForm(f => ({ ...f, account_number: '' }));
            refetch();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar la cuenta. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <LoadingState fullScreen />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="bg-surface border-b border-border px-5 pt-2 pb-3 flex-row items-center gap-3">
                <BackButton onPress={() => navigation.goBack()} />
                <Text className="text-[16px] font-extrabold text-ink flex-1" numberOfLines={1}>
                    Cuenta bancaria
                </Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
                <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ gap: 12, paddingBottom: 36 }}>

                    {account && (
                        <Card padding="sm" className={account.verified ? '!bg-success/10 !border-success/20' : '!bg-amber-50 !border-amber-100'}>
                            <View className="flex-row items-center gap-2">
                                {account.verified
                                    ? <CheckCircle2 size={16} color="#16a34a" />
                                    : <Clock size={16} color="#b45309" />}
                                <Text className={`text-[13px] font-extrabold ${account.verified ? 'text-success' : 'text-amber-700'}`}>
                                    {account.verified
                                        ? 'Cuenta verificada'
                                        : 'Cuenta pendiente de verificación'}
                                </Text>
                            </View>
                            <Text className="text-[12px] text-muted mt-1">
                                {account.bank_name} · terminada en {account.account_number_last4}
                            </Text>
                        </Card>
                    )}

                    <Card padding="sm">
                        <Text className="text-[13px] font-extrabold text-ink mb-3">
                            {account ? 'Corregir datos de la cuenta' : 'Registrar cuenta para recibir tus pagos'}
                        </Text>

                        <View className="gap-3">
                            <Input
                                label="Banco"
                                placeholder="Ej. Bancolombia"
                                value={form.bank_name}
                                onChangeText={(v) => setForm(f => ({ ...f, bank_name: v }))}
                            />

                            <View>
                                <Text className="text-[12px] font-semibold text-ink mb-1.5">Tipo de cuenta</Text>
                                <View className="flex-row gap-2">
                                    {ACCOUNT_TYPES.map(t => {
                                        const active = form.account_type === t.key;
                                        return (
                                            <Button
                                                key={t.key}
                                                variant={active ? 'primary' : 'secondary'}
                                                size="sm"
                                                className="flex-1"
                                                onPress={() => setForm(f => ({ ...f, account_type: t.key }))}
                                            >
                                                {t.label}
                                            </Button>
                                        );
                                    })}
                                </View>
                            </View>

                            <Input
                                label="Número de cuenta"
                                placeholder="Sin espacios ni guiones"
                                keyboardType="number-pad"
                                value={form.account_number}
                                onChangeText={(v) => setForm(f => ({ ...f, account_number: v.replace(/\D/g, '') }))}
                                hint={account ? 'Por seguridad no mostramos el número guardado — vuelve a escribirlo si quieres cambiarlo.' : undefined}
                            />

                            <Input
                                label="Cédula del titular"
                                keyboardType="number-pad"
                                value={form.account_holder_id_number}
                                onChangeText={(v) => setForm(f => ({ ...f, account_holder_id_number: v.replace(/\D/g, '') }))}
                            />
                        </View>
                    </Card>

                    <Button variant="primary" fullWidth loading={saving} disabled={!canSubmit} onPress={handleSave}>
                        {saving ? 'Guardando...' : 'Guardar cuenta'}
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
