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

/**
 * Pantalla de "pagar ahora". Hoy solo cubre el pago inicial (20%) — el pago
 * final (80%) reutilizará esta misma pantalla cuando exista (ver
 * paymentService en el backend, fase siguiente del roadmap de pagos).
 */
export default function PaymentScreen({ route, navigation }) {
    const { projectId, projectTitle, amount } = route.params || {};
    const { data: payments, loading, error, refetch } = usePayments(projectId);
    const [paying, setPaying] = useState(false);

    const initialPayment = (payments || []).find(p => p.type === 'inicial');
    const alreadyApproved = initialPayment?.status === 'aprobado';

    const handlePay = async () => {
        setPaying(true);
        try {
            const res = await api.post(`/payments/${projectId}/initial`);
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
                    Pago inicial
                </Text>
            </View>

            <View className="flex-1 px-4 pt-6 gap-4">
                <Card padding="sm">
                    <Text className="text-[13px] font-bold text-muted mb-1">Proyecto</Text>
                    <Text className="text-[16px] font-extrabold text-ink mb-4" numberOfLines={2}>
                        {projectTitle || 'Proyecto'}
                    </Text>

                    <Text className="text-[13px] font-bold text-muted mb-1">Monto a pagar (20%)</Text>
                    <Text className="text-[28px] font-extrabold text-brand mb-4">
                        {formatCOP(amount || initialPayment?.amount || 0)}
                    </Text>

                    <View className="flex-row items-start gap-2 bg-gray-50 rounded-xl p-3">
                        <ShieldCheck size={16} color={ICON.brand} style={{ marginTop: 1 }} />
                        <Text className="text-[12px] text-muted flex-1 leading-relaxed">
                            Este pago inicia el proyecto. El 80% restante se cobra cuando el trabajo quede
                            completado. HOME procesa los pagos a través de Wompi.
                        </Text>
                    </View>
                </Card>

                {alreadyApproved ? (
                    <Card padding="sm" className="!bg-success/10 !border-success/20">
                        <Text className="text-[14px] font-extrabold text-success text-center">
                            Pago confirmado — el proyecto ya está en progreso.
                        </Text>
                    </Card>
                ) : (
                    <Button variant="primary" fullWidth loading={paying} onPress={handlePay}>
                        {paying ? 'Abriendo pago...' : 'Pagar ahora'}
                    </Button>
                )}

                {initialPayment?.status === 'pendiente' && !alreadyApproved && (
                    <Button variant="ghost" fullWidth onPress={refetch}>
                        Ya pagué, verificar estado
                    </Button>
                )}
            </View>
        </SafeAreaView>
    );
}
