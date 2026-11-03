/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F8F5',
        surface: '#FFFFFF',
        'text-primary': '#202722',
        'text-secondary': '#747C75',
        accent: '#315C48',
        'accent-light': '#DCE9DF',
        border: '#E2E6DF',
        positive: '#367653',
        warning: '#B78035',
        critical: '#B74B43',
        'positive-light': '#EAF4EE',
        'warning-light': '#FDF3E3',
        'critical-light': '#FDECEA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs: ['0.7rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.5rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.375rem', { lineHeight: '2rem' }],
        '3xl': ['1.75rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '5px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06)',
        dropdown: '0 4px 16px rgba(0,0,0,0.10)',
        modal: '0 8px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
