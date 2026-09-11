/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f2f6fb",
          100: "#e3ecf6",
          200: "#c3d6ea",
          700: "#12365c",
          800: "#0b2545",
          900: "#071a33",
        },
        saffron: {
          400: "#ffb45e",
          500: "#ff9933",
          600: "#f27d0a",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
