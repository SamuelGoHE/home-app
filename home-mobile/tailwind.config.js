/** @type {import('tailwindcss').Config} */
const tokens = require('../design-system/tokens.js')

module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Existentes — sin cambios de valor.
        brand: {
          DEFAULT: '#E8432D',
          dark: '#c93820',
          soft: '#fff4f2',
        },
        ink: '#111111',
        muted: '#6b7280',
        surface: {
          DEFAULT: '#ffffff',
          soft: '#f8fafc',
        },
        // Design system HOME (Fase 0) — nuevas, ver design-system/tokens.js.
        text: tokens.colors.text,
        background: tokens.colors.background,
        border: tokens.colors.border,
        secondary: tokens.colors.secondary,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
      },
      fontSize: tokens.typography,
      spacing: tokens.spacing,
      borderRadius: {
        // Existente — sin cambios de valor.
        card: 18,
        // Design system HOME (Fase 0).
        input: tokens.radius.input,
      },
      boxShadow: {
        // Existente — sin cambios de valor.
        card: '0 10px 28px rgba(17, 24, 39, 0.06)',
        // Design system HOME (Fase 0).
        overlay: tokens.shadow.overlay,
      },
    },
  },
  plugins: [],
}