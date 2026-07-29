/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        red: { DEFAULT: '#E8432D', dark: '#c93820', light: '#FF6B4A' },
        dark: '#111111',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      borderRadius: { xl2: '20px', xl3: '28px', xl4: '40px' },
      boxShadow: { card: '0 8px 32px rgba(0,0,0,0.10)', heavy: '0 20px 60px rgba(0,0,0,0.18)' },
    },
  },
  plugins: [],
}
