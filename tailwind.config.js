/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './public/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        'ares-blue': '#1e40af',
        'ares-red': '#dc2626',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
