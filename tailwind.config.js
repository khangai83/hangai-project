/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Legacy style.css-ийн CSS хувьсагчтай ижил өнгөний схем
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          light: '#dbeafe',
        },
        secondary: {
          DEFAULT: '#059669',
          dark: '#047857',
        },
        brand: {
          sell: '#2563eb',
          rent: '#059669',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 10px 15px rgba(0,0,0,0.1)',
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        spin: 'spin 0.8s linear infinite',
        'slide-in': 'slideIn 0.3s ease',
      },
    },
  },
  plugins: [],
};
