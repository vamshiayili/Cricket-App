/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          pitch: '#1b4332',
          grass: '#2d6a4f',
          lightGrass: '#40916c',
          leather: '#b91c1c',
          ballRed: '#e63946',
          gold: '#f59e0b',
          darkBg: '#0f172a',
          cardBg: '#1e293b'
        }
      }
    },
  },
  plugins: [],
}
