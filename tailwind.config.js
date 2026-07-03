/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          150: '#eef1f6',
        },
        zinc: {
          850: '#202024',
        }
      }
    },
  },
  plugins: [],
}
