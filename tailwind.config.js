/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ステージ（暗色）ベース
        stage: {
          950: '#0B0C11',
          900: '#0F1117',
          850: '#141721',
          800: '#191D2A',
          750: '#212636',
          700: '#2A3043',
          600: '#3A4160',
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
