/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans KR"', "sans-serif"],
      },
      colors: {
        "color-1": "#F6F6F6",
        "color-2": "#E4E4E7",
        "color-3": "#D1D1D1",
        "color-4": "#71717A",
        "color-5": "#18181B",
        "color-6": "#3B82F6",
        "color-7": "#22C55E",
        "color-8": "#EF4444",
        "color-9": "#383838",
        "color-10": "#A5A5A5",
        "color-11": "#2A69D0",
        "color-12": "#3A91D1",
        "color-13": "#3385C1",
        "color-14": "rgba(255, 255, 255, 0.75)",
      },
      fontSize: {
        tiny: "0.5rem",
      },
      backgroundImage: {
        "white-gradient":
          "linear-gradient(to bottom, #FFFFFF, rgba(255, 255, 255, 0.75))",
      },
    },
  },
  plugins: [
    function ({ addUtilities, addComponents, theme }) {
      const newUtilities = {
        ".app-region-drag": {
          "-webkit-app-region": "drag",
        },
        ".app-region-no-drag": {
          "-webkit-app-region": "no-drag",
        },
        ".no-drag": {
          "user-select": "none",
        },
      };

      const newComponents = {
        ".card": {
          "background-color": "#fff",
          "border-radius": "0.5rem",
          padding: "1rem",
          border: `1px solid ${theme("colors.color-2")}`,
        },
      };

      addUtilities(newUtilities);
      addComponents(newComponents);
    },
  ],
};
