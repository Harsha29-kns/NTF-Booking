/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Defines the 'primary' color palette used in Layout.js
        primary: colors.indigo, // You can change 'indigo' to 'blue', 'violet', etc.
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Optional: matches the 'font-sans' class used
      },
    },
  },
  plugins: [],
}