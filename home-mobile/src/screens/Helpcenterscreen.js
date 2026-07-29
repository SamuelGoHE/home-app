import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, MessageCircle, Mail, Phone,
    ChevronDown, ChevronUp, AlertTriangle, ShieldCheck,
} from 'lucide-react-native';

/* ─── FAQs ───────────────────────────────────────────────────────── */
const FAQS = [
    {
        question: '¿Cómo se realiza el pago de un servicio?',
        answer: 'El pago se realiza directamente a través de la aplicación. Para iniciar el proyecto, se requiere un abono del 20% del valor total. El saldo restante puede pagarse por partes o al finalizar, pero siempre debe completarse el 100% antes de cerrar el proyecto.',
    },
    {
        question: '¿Los trabajadores están verificados?',
        answer: 'Sí, todos los trabajadores con la etiqueta "Verificado" han pasado por un proceso de validación de identidad y revisión de antecedentes por parte de nuestro equipo.',
    },
    {
        question: '¿Qué pasa si no estoy conforme con el trabajo?',
        answer: 'Puedes utilizar la opción "Reportar un problema" en el detalle del proyecto o contactarnos directamente por WhatsApp. Nuestro equipo mediará para buscar una solución justa.',
    },
    {
        question: '¿Cómo cancelo una cotización?',
        answer: 'Si la cotización aún está "en revisión", puedes cancelarla desde la sección "Mis proyectos". Si ya fue aprobada, debes contactar al soporte para anularla.',
    },
];

/* ─── Ítem de FAQ ────────────────────────────────────────────────── */
function FaqItem({ faq, open, onToggle }) {
    return (
        <TouchableOpacity
            onPress={onToggle}
            className="border-b border-gray-50 last:border-0"
            activeOpacity={0.7}
        >
            <View className="flex-row items-center justify-between px-5 py-4">
                <Text className="flex-1 font-semibold text-[14px] text-[#111] pr-3">{faq.question}</Text>
                {open
                    ? <ChevronUp size={17} color="#9ca3af" />
                    : <ChevronDown size={17} color="#9ca3af" />
                }
            </View>
            {open && (
                <Text className="px-5 pb-4 text-[13px] text-gray-500 leading-relaxed">
                    {faq.answer}
                </Text>
            )}
        </TouchableOpacity>
    );
}

/* ── Botón de contacto ────────────────────────────────────────────── */
function ContactBtn({ icon: Icon, label, sublabel, color, bg, onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="flex-row items-center gap-4 p-4 border-b border-gray-50 last:border-0 active:bg-gray-50"
            activeOpacity={0.75}
        >
            <View className="w-11 h-11 rounded-2xl items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                <Icon size={20} color={color} />
            </View>
            <View className="flex-1">
                <Text className="font-bold text-[15px] text-[#111]">{label}</Text>
                <Text className="text-[12px] text-gray-400 mt-0.5">{sublabel}</Text>
            </View>
        </TouchableOpacity>
    );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN SCREEN
══════════════════════════════════════════════════════════════════ */
export default function HelpCenterScreen({ navigation }) {
    const [openFaq, setOpenFaq] = useState(null);

    const toggleFaq = (i) => setOpenFaq((prev) => (prev === i ? null : i));

    const handleWhatsapp = () => {
        Linking.openURL('https://wa.me/573000000000?text=Hola%2C%20necesito%20ayuda%20con%20HOME')
            .catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp'));
    };

    const handleEmail = () => {
        Linking.openURL('mailto:soporte@homeapp.co?subject=Soporte%20HOME')
            .catch(() => Alert.alert('Error', 'No se pudo abrir el correo'));
    };

    const handlePhone = () => {
        Linking.openURL('tel:+573000000000')
            .catch(() => Alert.alert('Error', 'No se pudo realizar la llamada'));
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
                <Text className="font-extrabold text-[17px] text-[#111]">Centro de ayuda</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Banner */}
                <View
                    className="rounded-3xl p-6 mb-6 items-center overflow-hidden"
                    style={{ backgroundColor: '#E8432D' }}
                >
                    <View
                        className="absolute rounded-full"
                        style={{ width: 96, height: 96, backgroundColor: 'rgba(255,255,255,0.1)', top: -24, right: -24 }}
                    />
                    <View className="w-14 h-14 rounded-2xl items-center justify-center mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        <MessageCircle size={28} color="#fff" />
                    </View>
                    <Text className="text-[20px] font-extrabold text-white leading-tight text-center">
                        ¿En qué podemos ayudarte?
                    </Text>
                    <Text className="text-[14px] text-white/90 mt-1 font-medium">
                        Estamos aquí para resolver tus dudas
                    </Text>
                </View>

                {/* Contacto directo */}
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
                    Contacto Directo
                </Text>
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <ContactBtn
                        icon={MessageCircle}
                        label="WhatsApp"
                        sublabel="Respuesta en minutos"
                        color="#25D366"
                        bg="#f0fdf4"
                        onPress={handleWhatsapp}
                    />
                    <ContactBtn
                        icon={Mail}
                        label="Correo electrónico"
                        sublabel="soporte@homeapp.co"
                        color="#6366f1"
                        bg="#eef2ff"
                        onPress={handleEmail}
                    />
                    <ContactBtn
                        icon={Phone}
                        label="Llamada telefónica"
                        sublabel="Lun–Vie, 8am–6pm"
                        color="#E8432D"
                        bg="#fff4f2"
                        onPress={handlePhone}
                    />
                </View>

                {/* FAQs */}
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
                    Preguntas Frecuentes
                </Text>
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    {FAQS.map((faq, i) => (
                        <FaqItem
                            key={i}
                            faq={faq}
                            open={openFaq === i}
                            onToggle={() => toggleFaq(i)}
                        />
                    ))}
                </View>

                {/* Reportar / Políticas */}
                <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 ml-2">
                    Más Opciones
                </Text>
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <TouchableOpacity
                        className="flex-row items-center gap-4 px-4 py-4 border-b border-gray-50 active:bg-gray-50"
                        onPress={() => Alert.alert('Reportar problema', 'Esta función estará disponible pronto.')}
                        activeOpacity={0.75}
                    >
                        <View className="w-9 h-9 rounded-2xl items-center justify-center bg-orange-50">
                            <AlertTriangle size={18} color="#f97316" />
                        </View>
                        <Text className="flex-1 font-semibold text-[15px] text-[#111]">Reportar un problema</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-row items-center gap-4 px-4 py-4 active:bg-gray-50"
                        onPress={() => Alert.alert('Políticas', 'Esta función estará disponible pronto.')}
                        activeOpacity={0.75}
                    >
                        <View className="w-9 h-9 rounded-2xl items-center justify-center bg-emerald-50">
                            <ShieldCheck size={18} color="#10b981" />
                        </View>
                        <Text className="flex-1 font-semibold text-[15px] text-[#111]">Políticas de privacidad</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}