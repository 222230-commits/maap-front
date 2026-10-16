/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:  '#522B5B',
        dark:     '#2B124C',
        darkest:  '#190019',
        accent:   '#854F6C',
        soft:     '#DFB6B2',
        light:    '#FBE4D8',
      },
      fontFamily: {
        'tajawal': ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}