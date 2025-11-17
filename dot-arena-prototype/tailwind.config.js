/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        polkadot: {
          pink: '#E6007A',
          purple: '#552BBF',
          dark: '#1A1B1F',
        },
        arena: {
          ground: '#f5e4d7',
          dirt: '#d4a373',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
