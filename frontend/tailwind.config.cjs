/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00FF7F', // vibrant emerald/green from the mobile app
        secondary: '#0A0A0A', // dark background
        accent: '#FFD700', // gold/yellow for CTAs
        'neon-blue': '#00FFFF',
        'neon-purple': '#7B00FF',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fly-in': 'flyIn 0.6s ease-out',
        'jackpot-fly': 'jackpotFly 8s linear infinite',
        'flyUp': 'flyUp 2s ease-out forwards',
        'pulseTitle': 'pulseTitle 3s ease-in-out infinite',
        'pulseOverlay': 'pulseOverlay 4s ease-in-out infinite',
      },
      keyframes: {
        flyIn: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        flyUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-150%)', opacity: '0' },
        },
        pulseTitle: {
          '0%, 100%': { textShadow: '0 0 10px rgba(0,255,255,0.3)' },
          '50%': { textShadow: '0 0 20px rgba(0,255,255,0.6), 0 0 30px rgba(0,255,255,0.4)' },
        },
        pulseOverlay: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
