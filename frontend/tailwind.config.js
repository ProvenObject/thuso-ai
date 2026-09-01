/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3FCC',
          dark: '#152C99',
          light: '#4B65E0',
        },
        surface: '#F5F6FA',
        'surface-alt': '#EDEFF7',
        secondary: {
          DEFAULT: '#E4E9FA',
          text: '#1E3FCC',
        },
        ink: {
          DEFAULT: '#101322',
          soft: '#5B6072',
          faint: '#9AA0B4',
        },
        success: '#1E9E6B',
        warning: '#C97A1B',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 8px 24px -8px rgba(30, 63, 204, 0.15)',
        soft: '0 2px 10px rgba(16, 19, 34, 0.06)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.55 },
        },
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
