/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1a56db', dark: '#1e40af', light: '#eff6ff' }
      }
    }
  },
  plugins: []
}
