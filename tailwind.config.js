/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
      },
      colors: {
        ink: {
          950: '#0f172a',
          900: '#1f2937',
          800: '#334155',
          700: '#475569',
          600: '#64748b',
          500: '#94a3b8',
          400: '#b6c0d0',
          300: '#d7dee9',
          200: '#e5e9f2',
          100: '#eef1f6',
          50: '#f8fafc',
        },
        amber: {
          450: '#f59e0b',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Microsoft YaHei"', '"PingFang SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Consolas"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.06)',
        glow: '0 0 0 2px rgba(245,158,11,0.35), 0 4px 14px rgba(245,158,11,0.12)',
      },
    },
  },
  plugins: [],
}
