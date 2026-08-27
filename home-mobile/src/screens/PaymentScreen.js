import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ShieldCheck } from 'lucide-react-native';
import { usePayments } from '../hooks/useApi';
import api from '../services/api';
import { BackButton, Card, Button, LoadingState, ErrorState } from '../components/ui';

const ICON = {
    brand: '#E8432D',
};

const formatCOP = (n) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const COPY = {
    inicial: {
        title: 'Pago inicial',
        label: 'Monto a pagar (20%)',
        note: 'Este pago inicia el proyecto. El 80% restante se cobra cuando el trabajo quede completado. HOME procesa los pagos a través de Wompi.',
        confirmed: 'Pago confirmado — el proyecto ya está en progreso.',
    },
    final: {
        title: 'Pago final',
        label: 'Monto a pagar (80%)',
        note: 'Este es el pago final del proyecto — se libera al trabajador después de la ventana de revisión. HOME procesa los pagos a través de Wompi.',
        confirmed: 'Pago confirmado — gracias por completar el pago del proyecto.',
    },
};

/**
 * Pantalla de "pagar ahora", compartida entre el pago inicial (20%) y el
 * pago final (80%) — mismo mecanismo (Payment Link de Wompi abierto en el
 * navegador in-app), solo cambia el tipo y a qué endpoint se llama.
 */
export default function PaymentScreen({ route, navigation }) {
    const { projectId, projectTitle, amount, type = 'inicial' } = route.params || {};
    const copy = COPY[type] || COPY.inicial;
    const { data: payments, loading, error, refetch } = usePayments(projectId);
    const [paying, setPaying] = useState(false);

    const payment = (payments || []).find(p => p.type === type);
    const alreadyApproved = payment?.status === 'aprobado';

    const handlePay = async () => {
        setPaying(true);
        try {
            const res = await api.post(`/payments/${projectId}/${type}`);
            const { url } = res.data.data;
            await WebBrowser.openBrowserAsync(url);
            // Al volver del navegador, refrescamos por si el webhook ya confirmó.
            refetch();
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'No se pudo iniciar el pago. Intenta de nuevo.');
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <LoadingState fullScreen />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
                <ErrorState message={error} onRetry={refetch} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="bg-surface border-b border-border px-5 pt-2 pb-3 flex-row items-center gap-3">
                <BackButton onPress={() => navigation.goBack()} />
                <Text className="text-[16px] font-extrabold text-ink flex-1" numberOfLines={1}>
                    {copy.title}
                </Text>
            </View>

            <View className="flex-1 px-4 pt-6 gap-4">
                <Card padding="sm">
                    <Text className="text-[13px] font-bold text-muted mb-1">Proyecto</Text>
                    <Text className="text-[16px] font-extrabold text-ink mb-4" numberOfLines={2}>
                        {projectTitle || 'Proyecto'}
                    </Text>

                    <Text className="text-[13px] font-bold text-muted mb-1">{copy.label}</Text>
                    <Text className="text-[28px] font-extrabold text-brand mb-4">
                        {formatCOP(amount || payment?.amount || 0)}
                    </Text>

                    <View className="flex-row items-start gap-2 bg-gray-50 rounded-xl p-3">
                        <ShieldCheck size={16} color={ICON.brand} style={{ marginTop: 1 }} />
                        <Text className="text-[12px] text-muted flex-1 leading-relaxed">
                            {copy.note}
                        </Text>
                    </View>
                </Card>

                {alreadyApproved ? (
                    <Card padding="sm" className="!bg-success/10 !border-success/20">
                        <Text className="text-[14px] font-extrabold text-success text-center">
                            {copy.confirmed}
                        </Text>
                    </Card>
                ) : (
                    <Button variant="primary" fullWidth loading={paying} onPress={handlePay}>
                        {paying ? 'Abriendo pago...' : 'Pagar ahora'}
                    </Button>
                )}

                {payment?.status === 'pendiente' && !alreadyApproved && (
                    <Button variant="ghost" fullWidth onPress={refetch}>
                        Ya pagué, verificar estado
                    </Button>
                )}
            </View>
        </SafeAreaView>
    );
}
