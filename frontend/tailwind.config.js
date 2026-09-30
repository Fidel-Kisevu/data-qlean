/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FEFCFA',
          100: '#FDF8F3',
          200: '#F5EDE4',
          300: '#EBE0D3',
        },
        ink: {
          900: '#1A1A1A',
          700: '#3D3D3D',
          500: '#6B6B6B',
          400: '#9A9A9A',
        },
        accent: {
          DEFAULT: '#026555',
          soft:    '#DCEFEA',
          hover:   '#4d0101',
        },
      },
      boxShadow: {
        panel:
          '0 1px 2px rgba(28, 20, 12, 0.04), 0 2px 6px rgba(28, 20, 12, 0.04)',
        'panel-hover':
          '0 1px 2px rgba(28, 20, 12, 0.06), 0 4px 12px rgba(28, 20, 12, 0.06)',
        elevated:
          '0 4px 16px rgba(28, 20, 12, 0.08), 0 12px 32px rgba(28, 20, 12, 0.06)',
        inset:
          'inset 0 1px 2px rgba(28, 20, 12, 0.04)',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}