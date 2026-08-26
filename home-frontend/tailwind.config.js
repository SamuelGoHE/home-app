/** @type {import('tailwindcss').Config} */
import tokens from '../design-system/tokens.js'

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Existentes — sin cambios de valor.
        red: { DEFAULT: '#E8432D', dark: '#c93820', light: '#FF6B4A' },
        dark: '#111111',
        // Design system HOME (Fase 0) — alias semánticos nuevos, mismos
        // valores que `red`/`dark` donde coinciden. Ver design-system/tokens.js.
        brand: tokens.colors.brand,
        ink: tokens.colors.ink,
        text: tokens.colors.text,
        muted: tokens.colors.muted,
        surface: tokens.colors.surface,
        background: tokens.colors.background,
        border: tokens.colors.border,
        secondary: tokens.colors.secondary,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      fontSize: tokens.typography,
      spacing: tokens.spacing,
      borderRadius: {
        // Existentes — sin cambios de valor.
        xl2: '20px', xl3: '28px', xl4: '40px',
        // Design system HOME (Fase 0) — nombres que no colisionan con las
        // claves por defecto de Tailwind (sm/md/lg/xl ya existen en el tema
        // base; redeclararlas aquí las sobreescribiría en toda la app).
        input: `${tokens.radius.input}px`,
        card: `${tokens.radius.card}px`,
      },
      boxShadow: {
        // Existente — sin cambios de valor (usado hoy por ResultsScreen.jsx).
        card: '0 8px 32px rgba(0,0,0,0.10)',
        heavy: '0 20px 60px rgba(0,0,0,0.18)',
        // Design system HOME (Fase 0).
        raised: tokens.shadow.raised,
        overlay: tokens.shadow.overlay,
      },
    },
  },
  plugins: [],
}
