/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rarity-junk': '#AAAAAA',
        'rarity-basic': '#FFFFFF',
        'rarity-fine': '#62A4DA',
        'rarity-masterwork': '#1A9306',
        'rarity-rare': '#FCD00B',
        'rarity-exotic': '#FFA405',
        'rarity-ascended': '#FB3E8D',
        'rarity-legendary': '#4C139D',
        'gw2-dark': '#1a1a2e',
        'gw2-darker': '#0f0f1a',
        'gw2-accent': '#c9a227',
        'gw2-accent-hover': '#dbb32f',
      },
    },
  },
  plugins: [],
}

