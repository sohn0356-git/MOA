/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        notebook: '0 24px 60px rgb(76 58 42 / 14%)',
      },
      colors: {
        acorn: {
          50: '#fff8ed',
          100: '#ffedcf',
          500: '#da7b22',
          700: '#9e4e12',
        },
        paper: '#fffaf1',
        ink: '#2d251d',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
