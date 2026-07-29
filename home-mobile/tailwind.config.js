/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
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
      },
      borderRadius: {
        card: 18,
      },
      boxShadow: {
        card: '0 10px 28px rgba(17, 24, 39, 0.06)',
      },
    },
  },
  plugins: [],
}