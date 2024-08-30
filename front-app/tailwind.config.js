/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans KR"', "sans-serif"],
      },
      colors: {
        "color-1": "#F4F4F5",
        "color-2": "#E4E4E7",
        "color-3": "#D1D1D1",
        "color-4": "#71717A",
        "color-5": "#18181B",
        "color-6": "#3B82F6",
        "color-7": "#22C55E",
        "color-8": "#EF4444",
        "color-9": "#383838",
        "color-10": "#A5A5A5",
      },
    },
  },
  plugins: [
    function ({ addUtilities, addComponents }) {
      const newUtilities = {
        ".app-region-drag": {
          "-webkit-app-region": "drag",
        },
        ".app-region-no-drag": {
          "-webkit-app-region": "no-drag",
        },
      };

      const newComponents = {
        ".card": {
          "background-color": "#fff",
          "border-radius": "0.5rem",
          "box-shadow": "0 2px 4px rgba(0, 0, 0, 0.1)",
          "padding": "1rem",
          "transition": "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        },
        ".card:hover": {
          "box-shadow": "0 4px 8px rgba(0, 0, 0, 0.15)",
        },
      };

      addUtilities(newUtilities);
      addComponents(newComponents);
    },
  ],
};
