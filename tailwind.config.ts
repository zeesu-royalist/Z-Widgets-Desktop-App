import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      colors: {
        apple: {
          blue: '#0071e3',
          hoverBlue: '#0077ED',
          gray: {
            50: '#f5f5f7',
            100: '#e8e8ed',
            200: '#d2d2d7',
            300: '#86868b',
            400: '#6e6e73',
            500: '#515154',
            600: '#333336',
            700: '#1d1d1f',
            800: '#161617',
            900: '#000000'
          }
        }
      },
      borderRadius: {
        'apple-sm': '10px',
        'apple-md': '14px',
        'apple-lg': '18px',
        'apple-xl': '24px'
      },
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(255, 255, 255, 0.05)',
        'apple-focus': '0 0 0 4px rgba(0, 113, 227, 0.3)'
      }
    }
  },
  plugins: []
} satisfies Config
