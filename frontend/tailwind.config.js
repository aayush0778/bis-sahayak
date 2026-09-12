/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: "#FAF8F3", deep: "#F2EEE3", edge: "#E7E1D3" },
        ink: { DEFAULT: "#1C1B19", soft: "#57534E", faint: "#8A8478" },
        navy: { DEFAULT: "#1E3A5F", deep: "#152A45", wash: "#EAEFF5" },
        brass: { DEFAULT: "#B8860B", deep: "#8C6508", wash: "#F5EDD8" },
        signal: { DEFAULT: "#9B2C2C", wash: "#F6E4E4" },
        moss: { DEFAULT: "#2F6846", wash: "#E4EFE8" },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', "Georgia", '"Times New Roman"', "serif"],
        sans: ['"IBM Plex Sans"', "system-ui", '"Segoe UI"', "sans-serif"],
      },
      borderWidth: {
        hairline: "1px",
      },
      keyframes: {
        stamp: {
          "0%": { transform: "scale(1.35)", opacity: "0" },
          "60%": { transform: "scale(0.96)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        stamp: "stamp 260ms ease-out both",
      },
    },
  },
  plugins: [],
};
