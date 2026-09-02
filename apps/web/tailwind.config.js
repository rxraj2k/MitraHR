/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mitra: {
          navy: '#0f1030',
          navyLight: '#1a1b3f',
          accentFrom: '#7c6fff',
          accentTo: '#4fd1ff',
        },
      },
    },
  },
  plugins: [],
};
