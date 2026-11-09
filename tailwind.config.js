/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Reel Niki Aroca — paleta roja: dos tranquilos + uno fuerte.
        // Red Orange (fuerte) + Snowy White (tranquilo); el lima es
        // aproximado: el hex de "Yellow Punk" no se leía en el video.
        primary: "#F42902",
        accent: "#D9FF3D",
        snow: "#FDFDFF",
        ink: "#161616",
      },
      fontFamily: {
        display: ["var(--font-display)", '"Arial Narrow"', "sans-serif"],
      },
    },
  },
  plugins: []
};
