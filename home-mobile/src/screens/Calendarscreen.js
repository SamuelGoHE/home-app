import React, { useState, useMemo } from 'react';
import {
    View, Text, ScrollView, Pressable,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, Calendar as CalendarIcon, Send,
} from 'lucide-react-native';
import {
    format, startOfMonth, getDaysInMonth, getDay,
    addMonths, isBefore, isAfter, isEqual,
} from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { Button, IconButton, BackButton, Card } from '../components/ui';

/* ─── Helpers ────────────────────────────────────────────────────── */
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Colores literales necesarios para props `color` de lucide-react-native
 * (los íconos SVG no aceptan clases de Tailwind). Cada uno coincide
 * exactamente con el token homónimo de design-system/tokens.js.
 */
const ICON = {
    muted: '#6b7280',
    brand: '#E8432D',
    surface: '#ffffff',
};

/* ─── MonthGrid ──────────────────────────────────────────────────── */
function MonthGrid({ month, startDate, endDate, rangeMode, onSelect }) {
    const firstDay = getDay(startOfMonth(month));
    const days = getDaysInMonth(month);

    return (
        <View>
            {/* Weekday headers */}
            <View className="flex-row mb-1">
                {DAY_LABELS.map((d, i) => (
                    <View key={i} className="flex-1 items-center pb-2">
                        <Text className="text-[11px] font-bold text-gray-400 uppercase">{d}</Text>
                    </View>
                ))}
            </View>

            {/* Days grid — we build rows of 7 */}
            {(() => {
                const cells = [];
                // Leading empty cells
                for (let i = 0; i < firstDay; i++) cells.push(null);
                // Day cells
                for (let i = 1; i <= days; i++) {
                    cells.push(new Date(month.getFullYear(), month.getMonth(), i));
                }
                // Pad to complete last row
                while (cells.length % 7 !== 0) cells.push(null);

                const rows = [];
                for (let r = 0; r < cells.length / 7; r++) {
                    rows.push(cells.slice(r * 7, r * 7 + 7));
                }

                return rows.map((row, ri) => (
                    <View key={ri} className="flex-row mb-1">
                        {row.map((date, ci) => {
                            if (!date) return <View key={ci} className="flex-1" />;

                            const isPast = isBefore(date, TODAY);
                            const isStart = !!(startDate && isEqual(date, startDate));
                            const isEnd = !!(endDate && isEqual(date, endDate));
                            const isEndpoint = isStart || isEnd;
                            const isInRange = rangeMode && !!(startDate && endDate && isAfter(date, startDate) && isBefore(date, endDate));
                            const label = isEndpoint || isInRange
                                ? `${format(date, "d 'de' MMMM", { locale: es })}${isStart ? ', inicio' : isEnd ? ', fin' : ', dentro del rango'}`
                                : format(date, "d 'de' MMMM", { locale: es });

                            return (
                                <View key={ci} className="flex-1 items-center">
                                    <View
                                        className={[
                                            'w-full h-9 items-center justify-center',
                                            isInRange ? 'bg-brand/15' : '',
                                            isStart && rangeMode ? 'rounded-l-full' : '',
                                            isEnd && rangeMode ? 'rounded-r-full' : '',
                                        ].filter(Boolean).join(' ')}
                                    >
                                        <Pressable
                                            onPress={() => !isPast && onSelect(date)}
                                            disabled={isPast}
                                            accessibilityRole="button"
                                            accessibilityLabel={label}
                                            accessibilityState={{ selected: isEndpoint, disabled: isPast }}
                                            className={`w-9 h-9 items-center justify-center rounded-full ${isEndpoint ? 'bg-brand' : ''
                                                }`}
                                            style={isEndpoint
                                                ? { shadowColor: ICON.brand, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }
                                                : undefined
                                            }
                                        >
                                            <Text
                                                className={`text-[14px] font-semibold ${isPast
                                                        ? 'text-gray-300'
                                                        : isEndpoint
                                                            ? 'text-white'
                                                            : isInRange
                                                                ? 'text-brand'
                                                                : 'text-ink'
                                                    }`}
                                            >
                                                {date.getDate()}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ));
            })()}
        </View>
    );
}

/* ══════════════════════════════════════════════════════════════════
   CALENDAR SCREEN — si el trabajador cobra por día, el cliente elige un
   rango (inicio + fin); para cualquier otra tarifa (hora/m²/proyecto/a
   convenir) solo elige un único día en que necesita que empiece.
   Params: { workerId, serviceId, serviceName, city, address,
             sq_meters, occupied, notes,
             workerRateUnit, workerRateAmount, workerRateNote }
══════════════════════════════════════════════════════════════════ */
export default function CalendarScreen({ route, navigation }) {
    const {
        workerId,
        serviceId,
        serviceName = 'Servicio',
        city = '',
        address = '',
        sq_meters = '',
        occupied = false,
        notes = '',
        workerRateUnit = '',
        workerRateAmount = '',
        workerRateNote = '',
    } = route.params || {};

    const isQuoted = workerRateUnit === 'a_convenir';
    const hasPricing = !!workerRateUnit;
    const rangeMode = workerRateUnit === 'por_dia';
    const workerDailyRate = workerRateUnit === 'por_dia' ? workerRateAmount : '';
    const calculatedM2 = workerRateUnit === 'por_m2' && sq_meters && Number(workerRateAmount) > 0
      ? Number(workerRateAmount) * Number(sq_meters)
      : null;
    const workerContractNote = workerRateNote || (isQuoted
      ? 'El profesional confirmará el valor después de revisar el alcance.'
      : `${workerRateUnit === 'por_m2' && calculatedM2 ? `Estimado para ${sq_meters} m²: $${calculatedM2.toLocaleString('es-CO')}. ` : ''}Tarifa: $${Number(workerRateAmount).toLocaleString('es-CO')} ${workerRateUnit.replace('por_', 'por ')}`);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [loading, setLoading] = useState(false);

    const canSubmit = !!startDate && (!rangeMode || !!endDate) && hasPricing && !loading;

    const months = useMemo(
        () => [TODAY, addMonths(TODAY, 1), addMonths(TODAY, 2)],
        []
    );

    // Fecha única: tocar selecciona, tocar el mismo día deselecciona.
    // Rango (por día): primer toque = inicio; segundo toque después del
    // inicio = fin; tocar antes del inicio reinicia el rango desde ahí;
    // con inicio y fin ya puestos, el siguiente toque empieza un rango nuevo.
    const selectDay = (date) => {
        if (!rangeMode) {
            setStartDate(prev => (prev && isEqual(date, prev) ? null : date));
            return;
        }
        if (!startDate || (startDate && endDate)) {
            setStartDate(date);
            setEndDate(null);
            return;
        }
        if (isEqual(date, startDate)) {
            setStartDate(null);
            return;
        }
        if (isBefore(date, startDate)) {
            setStartDate(date);
            return;
        }
        setEndDate(date);
    };

    const handleConfirm = async () => {
        if (!canSubmit) return;
        if (!workerId || !serviceId) {
            Alert.alert('Error', 'Faltan datos del servicio. Vuelve a seleccionar el trabajador.');
            navigation.goBack();
            return;
        }

        setLoading(true);
        try {
            await api.post('/quotes', {
                service_id: serviceId,
                worker_id: workerId,
                city,
                address,
                sq_meters: sq_meters ? parseFloat(sq_meters) : null,
                occupied,
                notes,
                start_date: format(startDate, 'yyyy-MM-dd'),
                end_date: rangeMode && endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
            });

            // Ir directamente a los proyectos sin alert
            navigation.navigate('ProjectsTab', { screen: 'ProjectsTabScreen' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al enviar la solicitud';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">

            {/* ── Header ── */}
            <View className="bg-surface border-b border-border px-5 pt-2 pb-3">
                <View className="flex-row items-center gap-3 mb-3">
                    <BackButton onPress={() => navigation.goBack()} />
                    <View className="flex-1">
                        <Text className="text-[18px] font-extrabold text-ink leading-tight">
                            ¿Cuándo lo necesitas?
                        </Text>
                        <Text className="text-[12px] text-muted font-medium">
                            Selecciona la fecha de inicio del servicio
                        </Text>
                    </View>
                    <View className="w-9 h-9 items-center justify-center rounded-xl bg-brand-soft">
                        <CalendarIcon size={18} color={ICON.brand} />
                    </View>
                </View>

                {/* Resumen del servicio */}
                {serviceName && serviceName !== 'Servicio' && (
                    <View className="flex-row items-center gap-2 px-3 py-2 bg-brand-soft rounded-xl border border-orange-100">
                        <Text className="text-[13px] font-bold text-brand flex-1" numberOfLines={1}>
                            {serviceName}
                        </Text>
                        {city ? (
                            <Text className="text-[11px] text-muted flex-shrink-0">· {city}</Text>
                        ) : null}
                    </View>
                )}
            </View>

            {/* ── Calendar scroll ── */}
            <ScrollView
                className="flex-1 px-4 pt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 160 }}
            >
                {/* ── Modalidad de cobro y tarifa fija — arriba de todo, no hay que buscarla ── */}
                <Card padding="lg" className="mb-4">
                    <Text className="font-bold text-[15px] text-ink mb-1">¿Cómo quieres cotizar?</Text>

                    {!hasPricing ? (
                        <View className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <Text className="text-[13px] font-bold text-amber-700">
                                Este trabajador todavía no configuró sus tarifas
                            </Text>
                            <Text className="text-[12px] text-amber-600 mt-1">
                                No podrás enviar la solicitud hasta que publique un precio fijo.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text className="text-[12px] text-muted mb-4">
                                Este es el precio fijo que el trabajador cobra — no hay que ofertar.
                            </Text>

                            {rangeMode ? (
                                <View className="p-4 bg-gray-50 rounded-2xl flex-row items-center justify-between">
                                    <Text className="text-[12px] font-bold text-muted uppercase tracking-wide">Precio por día</Text>
                                    <Text className="text-[20px] font-black text-ink">
                                        {workerDailyRate ? `$${Number(workerDailyRate).toLocaleString('es-CO')}` : '—'}
                                    </Text>
                                </View>
                            ) : (
                                <View className="p-4 bg-gray-50 rounded-2xl">
                                    <Text className="text-[12px] font-bold text-muted uppercase tracking-wide mb-1.5">
                                        Cómo cotiza este trabajo
                                    </Text>
                                    {workerContractNote ? (
                                        <Text className="text-[13px] font-semibold text-ink leading-relaxed">
                                            {workerContractNote}
                                        </Text>
                                    ) : (
                                        <Text className="text-[13px] font-semibold text-amber-600">
                                            Este trabajador aún no describió cómo cotiza sus contratos
                                        </Text>
                                    )}
                                    <Text className="text-[11px] text-muted mt-2">
                                        El precio final te lo confirmará el trabajador después de revisar tu solicitud.
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </Card>

                {months.map((month, mi) => (
                    <Card padding="md" key={mi} className="mb-4">
                        <View className="flex-row justify-between items-center mb-4 px-1">
                            <Text className="font-extrabold text-[15px] text-ink capitalize">
                                {format(month, 'MMMM', { locale: es })}
                            </Text>
                            <Text className="text-muted text-[13px] font-semibold">
                                {format(month, 'yyyy')}
                            </Text>
                        </View>
                        <MonthGrid month={month} startDate={startDate} endDate={endDate} rangeMode={rangeMode} onSelect={selectDay} />
                    </Card>
                ))}
            </ScrollView>

            {/* ── Footer CTA ── */}
            <View className="absolute bottom-0 left-0 right-0 bg-surface border-t border-border px-5 pt-4 pb-8">
                {/* Fecha seleccionada */}
                <View className="flex-row items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-border mb-3">
                    <View className="w-9 h-9 rounded-xl bg-brand-soft items-center justify-center">
                        <CalendarIcon size={16} color={ICON.brand} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] font-bold text-muted uppercase tracking-wide mb-0.5">
                            {rangeMode ? 'Fecha de inicio' : 'Fecha'}
                        </Text>
                        <Text
                            className={`text-[14px] font-bold capitalize ${startDate ? 'text-ink' : 'text-muted'}`}
                            numberOfLines={1}
                        >
                            {startDate
                                ? format(startDate, "EEEE d 'de' MMMM", { locale: es })
                                : 'Toca un día en el calendario'}
                        </Text>
                        {rangeMode && (
                            <>
                                <Text className="text-[10px] font-bold text-muted uppercase tracking-wide mb-0.5 mt-2">
                                    Fecha de fin
                                </Text>
                                <Text
                                    className={`text-[14px] font-bold capitalize ${endDate ? 'text-ink' : 'text-muted'}`}
                                    numberOfLines={1}
                                >
                                    {endDate
                                        ? format(endDate, "EEEE d 'de' MMMM", { locale: es })
                                        : startDate
                                            ? 'Toca el último día'
                                            : 'Elige primero el inicio'}
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                <Button
                    variant="primary"
                    fullWidth
                    loading={loading}
                    disabled={!canSubmit}
                    onPress={handleConfirm}
                    accessibilityLabel="Enviar solicitud al trabajador"
                >
                    {loading ? null : (
                        <>
                            <Send size={18} color={ICON.surface} strokeWidth={2.5} />
                            <Text className="text-white font-extrabold text-[16px]">
                                Enviar solicitud al trabajador
                            </Text>
                        </>
                    )}
                </Button>

                <Text className="text-center text-[11px] text-muted mt-2">
                    {hasPricing
                        ? 'El trabajador aceptará o rechazará tu solicitud'
                        : 'Este trabajador aún no tiene tarifas configuradas'}
                </Text>
            </View>
        </SafeAreaView>
    );
}
