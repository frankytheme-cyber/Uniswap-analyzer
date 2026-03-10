/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        good: '#22c55e',
        warn: '#f59e0b',
        bad:  '#ef4444',
      },
    },
  },
  plugins: [],
}
