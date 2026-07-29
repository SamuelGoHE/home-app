import React, { useState, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar as CalendarIcon, Send } from 'lucide-react-native';
import {
    format, startOfMonth, getDaysInMonth, getDay,
    addMonths, isBefore, isEqual,
} from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../services/api';

/* ─── Helpers ────────────────────────────────────────────────────── */
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/* ─── MonthGrid ──────────────────────────────────────────────────── */
function MonthGrid({ month, selectedDate, onSelect }) {
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
                            const isSelected = selectedDate && isEqual(date, selectedDate);

                            return (
                                <View key={ci} className="flex-1 items-center">
                                    <TouchableOpacity
                                        onPress={() => !isPast && onSelect(date)}
                                        disabled={isPast}
                                        className={`w-9 h-9 items-center justify-center rounded-full ${isSelected ? 'bg-[#E8432D]' : ''
                                            }`}
                                        style={isSelected
                                            ? { shadowColor: '#E8432D', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }
                                            : undefined
                                        }
                                    >
                                        <Text
                                            className={`text-[14px] font-semibold ${isPast
                                                    ? 'text-gray-300'
                                                    : isSelected
                                                        ? 'text-white'
                                                        : 'text-[#111]'
                                                }`}
                                        >
                                            {date.getDate()}
                                        </Text>
                                    </TouchableOpacity>
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
   CALENDAR SCREEN — el cliente elige solo la fecha de inicio;
   la duración del trabajo la define el profesional.
   Params: { workerId, serviceId, serviceName, city, address,
             sq_meters, occupied, notes }
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
    } = route.params || {};

    const [startDate, setStartDate] = useState(null);
    const [loading, setLoading] = useState(false);

    const months = useMemo(
        () => [TODAY, addMonths(TODAY, 1), addMonths(TODAY, 2)],
        []
    );

    // Tocar un día lo selecciona; tocar el mismo día lo deselecciona
    const selectDay = (date) => {
        setStartDate(prev => (prev && isEqual(date, prev) ? null : date));
    };

    const handleConfirm = async () => {
        if (!startDate) return;
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
                end_date: null,
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
        <SafeAreaView className="flex-1 bg-[#f8f9fb]">

            {/* ── Header ── */}
            <View className="bg-white border-b border-gray-100 px-5 pt-2 pb-3">
                <View className="flex-row items-center gap-3 mb-3">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-9 h-9 items-center justify-center rounded-xl bg-gray-50 border border-gray-100"
                    >
                        <ArrowLeft size={18} color="#4b5563" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-[18px] font-extrabold text-[#111] leading-tight">
                            ¿Cuándo lo necesitas?
                        </Text>
                        <Text className="text-[12px] text-gray-400 font-medium">
                            Selecciona la fecha de inicio del servicio
                        </Text>
                    </View>
                    <View className="w-9 h-9 items-center justify-center rounded-xl bg-red-50">
                        <CalendarIcon size={18} color="#E8432D" />
                    </View>
                </View>

                {/* Resumen del servicio */}
                {serviceName && serviceName !== 'Servicio' && (
                    <View className="flex-row items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-100">
                        <Text className="text-[13px] font-bold text-[#E8432D] flex-1" numberOfLines={1}>
                            {serviceName}
                        </Text>
                        {city ? (
                            <Text className="text-[11px] text-gray-400 flex-shrink-0">· {city}</Text>
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
                {months.map((month, mi) => (
                    <View key={mi} className="mb-4 bg-white rounded-3xl p-4 border border-gray-100">
                        <View className="flex-row justify-between items-center mb-4 px-1">
                            <Text className="font-extrabold text-[15px] text-[#111] capitalize">
                                {format(month, 'MMMM', { locale: es })}
                            </Text>
                            <Text className="text-gray-400 text-[13px] font-semibold">
                                {format(month, 'yyyy')}
                            </Text>
                        </View>
                        <MonthGrid month={month} selectedDate={startDate} onSelect={selectDay} />
                    </View>
                ))}
            </ScrollView>

            {/* ── Footer CTA ── */}
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 pt-4 pb-8">
                {/* Fecha seleccionada */}
                <View className="flex-row items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 mb-3">
                    <View className="w-9 h-9 rounded-xl bg-red-50 items-center justify-center">
                        <CalendarIcon size={16} color="#E8432D" />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                            Fecha de inicio
                        </Text>
                        <Text
                            className={`text-[14px] font-bold capitalize ${startDate ? 'text-[#111]' : 'text-gray-400'}`}
                            numberOfLines={1}
                        >
                            {startDate
                                ? format(startDate, "EEEE d 'de' MMMM", { locale: es })
                                : 'Toca un día en el calendario'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={!startDate || loading}
                    className="w-full flex-row items-center justify-center gap-2 py-4 bg-[#E8432D] rounded-2xl"
                    style={{
                        opacity: !startDate || loading ? 0.4 : 1,
                        shadowColor: '#E8432D',
                        shadowOpacity: 0.3,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 4 },
                    }}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Send size={18} color="#fff" strokeWidth={2.5} />
                            <Text className="text-white font-extrabold text-[16px]">
                                Enviar solicitud al trabajador
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text className="text-center text-[11px] text-gray-400 mt-2">
                    El trabajador aceptará o rechazará tu solicitud
                </Text>
            </View>
        </SafeAreaView>
    );
}
