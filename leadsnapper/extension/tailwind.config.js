/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#e8f0f9',
          100: '#c5d9f0',
          600: '#1F4E79',
          700: '#163a5c',
          800: '#0d2540',
        },
        hot:  '#dc2626',
        warm: '#d97706',
        cold: '#6b7280',
      },
    },
  },
  plugins: [],
}
