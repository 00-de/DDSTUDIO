/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ベース（明るいパステル）
        stage: {
          950: '#F3F0FF',
          900: '#FFFFFF',
          850: '#F7F4FF',
          800: '#E7E1F7',
          750: '#EDE7FE',
          700: '#D6CBF2',
          600: '#6B5B95',
        },
        // DayDream アクセント（ドリーム・グラデーション）
        dream: {
          violet: '#A855F7',
          pink: '#EC4899',
          cyan: '#22D3EE',
        },
        // メンバーカラー
        yuma: '#3B82F6',
        aoi: '#22C55E',
        ren: '#A855F7',
        yui: '#EC4899',
        daichi: '#F97316',
      },
      fontFamily: {
        sans: ['"Yu Gothic UI"', '"Meiryo"', '"Hiragino Kaku Gothic ProN"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(168,85,247,0.5)',
        'glow-pink': '0 0 24px -4px rgba(236,72,153,0.5)',
      },
    },
  },
  plugins: [],
}
