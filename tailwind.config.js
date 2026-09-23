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

        // ---------- Товчнууд (бодит 3D мэт) ----------
        // ЗАГВАР: дотроос гэрэлтсэн ДЭЭД ирмэг (inset 0 1px 0 white) + доод
        // ирмэг дээр бараан зураас + гадна зөөлөн сүүдэр. Хослуулбал товч
        // «гадаргуунаас товойсон» мэт харагдана.
        btn: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(16,24,40,0.08), 0 3px 8px -2px rgba(16,24,40,0.14)',
        'btn-hover':
          'inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 4px rgba(16,24,40,0.10), 0 10px 18px -6px rgba(16,24,40,0.24)',
        'btn-active': 'inset 0 2px 5px rgba(16,24,40,0.20), 0 1px 1px rgba(16,24,40,0.06)',

        // Өнгөт товч: сүүдэр нь тухайн өнгөөрөө «гэрэлтэнэ»
        'btn-primary':
          'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.14), 0 1px 2px rgba(16,24,40,0.12), 0 4px 12px -3px rgba(37,99,235,0.55)',
        'btn-primary-hover':
          'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 5px rgba(16,24,40,0.14), 0 12px 22px -6px rgba(37,99,235,0.68)',
        'btn-primary-active': 'inset 0 2px 6px rgba(0,0,0,0.30), 0 1px 1px rgba(16,24,40,0.06)',

        'btn-secondary':
          'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.14), 0 1px 2px rgba(16,24,40,0.12), 0 4px 12px -3px rgba(5,150,105,0.50)',
        'btn-secondary-hover':
          'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 5px rgba(16,24,40,0.14), 0 12px 22px -6px rgba(5,150,105,0.62)',
        'btn-secondary-active': 'inset 0 2px 6px rgba(0,0,0,0.30), 0 1px 1px rgba(16,24,40,0.06)',

        'btn-danger':
          'inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.14), 0 1px 2px rgba(16,24,40,0.12), 0 4px 12px -3px rgba(220,38,38,0.50)',
        'btn-danger-hover':
          'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 5px rgba(16,24,40,0.14), 0 12px 22px -6px rgba(220,38,38,0.62)',
        'btn-danger-active': 'inset 0 2px 6px rgba(0,0,0,0.30), 0 1px 1px rgba(16,24,40,0.06)',

        // Идэвхтэй сегмент-чип (хугацааны сонголт)
        chip: '0 1px 2px rgba(16,24,40,0.10), 0 2px 6px -2px rgba(16,24,40,0.16)',
      },
      keyframes: {
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        // Дэлгэрэнгүй хайлтын панель дээрээс доошоо нээгдэх хөдөлгөөн
        slideDown: {
          from: { transform: 'translateY(-6px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        // Хандалтын графикийн баганууд доороосоо өсөх хөдөлгөөн
        // (origin-bottom-той хамт ашиглана — MyListingsStatsPanel)
        growUp: {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
      },
      animation: {
        spin: 'spin 0.8s linear infinite',
        'slide-in': 'slideIn 0.3s ease',
        'slide-down': 'slideDown 0.18s ease-out',
        'grow-up': 'growUp 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
