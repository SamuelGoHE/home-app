import React from 'react';
import { View, Text } from 'react-native';
import { Check, X } from 'lucide-react-native';

/* Reglas alineadas con la validación del backend (auth.js):
   mínimo 8 caracteres, una mayúscula, una minúscula y un número. */
export const PASSWORD_RULES = [
  { key: 'len',   label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { key: 'upper', label: 'Una letra mayúscula (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Una letra minúscula (a-z)', test: (p) => /[a-z]/.test(p) },
  { key: 'num',   label: 'Un número (0-9)', test: (p) => /\d/.test(p) },
];

export const isPasswordValid = (password) =>
  PASSWORD_RULES.every(r => r.test(password));

/**
 * Checklist dinámico de requisitos de contraseña.
 * Se muestra mientras el usuario escribe para que detecte al instante
 * qué le falta (mayúscula, número, etc.) en vez de un error genérico.
 */
export default function PasswordChecklist({ password, hint }) {
  return (
    <View className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 gap-1.5">
      {hint ? (
        <Text className="text-[11px] font-semibold text-gray-500 mb-0.5">{hint}</Text>
      ) : null}
      {PASSWORD_RULES.map(rule => {
        const ok = rule.test(password);
        return (
          <View key={rule.key} className="flex-row items-center gap-2">
            <View
              className="w-4 h-4 rounded-full items-center justify-center"
              style={{ backgroundColor: ok ? '#16a34a' : '#e5e7eb' }}
            >
              {ok
                ? <Check size={11} color="#fff" strokeWidth={3} />
                : <X size={10} color="#9ca3af" strokeWidth={3} />}
            </View>
            <Text className={`text-[12px] font-medium ${ok ? 'text-green-700' : 'text-gray-400'}`}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
