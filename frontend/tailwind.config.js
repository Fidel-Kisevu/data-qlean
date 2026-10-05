/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
     colors: {
  cream: {
    50:  '#FCFAF7',
    100: '#F7F3ED',
    200: '#EEE7DD',
    300: '#E2D8CA',
    400: '#D2C4B3',
    500: '#BFAF9B',
    600: '#A89580',
    700: '#8D7965',
    800: '#705E4D',
    900: '#514438',
  },
  ink: {
    100: '#F9F9F8',
    200: '#F0F1F0',
    300: '#E1E4E2',
    400: '#C9D0C9',
    500: '#AEB7AE',
    600: '#8B968B',
    700: '#6A7A6A',
    800: '#4D5C4D',
    900: '#1F2422',
    700: '#343A37',
    500: '#68716D',
    400: '#4B5450',
  },
  accent: {
    DEFAULT: '#176B5B',
    soft:    '#DDEDE8',
    hover:   '#0F5145',
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