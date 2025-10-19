import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        neonPink: '#FF006E',
        neonGold: '#FFD60A',
        cafeNight: '#0D0D0D',
        cafeShadow: '#1A1A1A',
      },
      boxShadow: {
        neon: '0 0 35px rgba(255, 0, 110, 0.45)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
