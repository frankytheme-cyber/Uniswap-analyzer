/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        good: '#10b981',   // emerald-500
        warn: '#f59e0b',   // amber-500
        bad:  '#ef4444',   // red-500
        slate: {
          400: '#64748b',  // boosted contrast (was #94a3b8, now same as default slate-500)
          500: '#475569',  // boosted contrast (was #64748b, now same as default slate-600)
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
