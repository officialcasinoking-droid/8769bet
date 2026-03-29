/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#f1f5f9',
          muted: '#94a3b8',
          sidebar: '#1e293b',
        },
        primary: {
          400: '#22c55e',
          500: '#16a34a',
          600: '#15803d',
        }
      }
    },
  },
  plugins: [],
}
