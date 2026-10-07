/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      xs: '360px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e', // Canonical Deep Teal
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
          DEFAULT: '#0f766e',
        },
        ivory: {
          50: '#fdfbf7',  // Primary warm app background
          100: '#faf7f2', // Secondary container background
          200: '#f2ece1', // Card border & dividers
          300: '#e7dfd3', // Darker warm divider
          DEFAULT: '#fdfbf7',
        },
        grade: {
          fail: {
            bg: '#fef2f2',
            text: '#b91c1c',
            border: '#fecaca',
          },
          pass: {
            bg: '#eff6ff',
            text: '#1d4ed8',
            border: '#bfdbfe',
          },
          excellent: {
            bg: '#ecfdf5',
            text: '#047857',
            border: '#a7f3d0',
          },
          absent: {
            bg: '#fffbeb',
            text: '#92400e',
            border: '#fde68a',
          },
        },
      },
      fontFamily: {
        sans: ['Tajawal', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Noto Sans Arabic', 'sans-serif'],
        tajawal: ['Tajawal', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Noto Sans Arabic', 'sans-serif'],
        serif: ['Amiri', 'Traditional Arabic', 'Scheherazade New', 'serif'],
        amiri: ['Amiri', 'Traditional Arabic', 'Scheherazade New', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
      spacing: {
        touch: '48px',
        'touch-sm': '44px',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(15, 118, 110, 0.05), 0 1px 2px -1px rgba(15, 118, 110, 0.05)',
        sheet: '0 -4px 16px -1px rgba(0, 0, 0, 0.08), 0 -2px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
