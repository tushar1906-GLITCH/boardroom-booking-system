/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0E16',
        surface: {
          50: '#1E2638',
          100: '#182030',
          200: '#151B2A',
          300: '#0F1420',
          DEFAULT: '#0F1420',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          light: 'rgba(255, 255, 255, 0.15)',
          muted: 'rgba(255, 255, 255, 0.04)',
        },
        primary: {
          DEFAULT: '#7C6CFF',
          hover: '#6955FF',
          light: '#9384FF',
          dark: '#5B47F0',
          muted: 'rgba(124, 108, 255, 0.15)',
        },
        teal: {
          DEFAULT: '#2DD4BF',
          hover: '#14B8A6',
          muted: 'rgba(45, 212, 191, 0.15)',
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          muted: 'rgba(239, 68, 68, 0.15)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          muted: 'rgba(245, 158, 11, 0.15)',
        },
        success: {
          DEFAULT: '#10B981',
          hover: '#059669',
          muted: 'rgba(16, 185, 129, 0.15)',
        },
        muted: {
          DEFAULT: '#94A3B8',
          foreground: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 25px -5px rgba(124, 108, 255, 0.25)',
      },
    },
  },
  plugins: [],
}
