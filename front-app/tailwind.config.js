/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      minHeight: {
        108: "26rem",
      },
      fontFamily: {
        sans: ["Noto Sans", "Noto Sans KR", "sans-serif"],
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
        "color-15": "#7FC0EF",

        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontSize: {
        tiny: "0.5rem",
      },
      backgroundImage: {
        "white-gradient":
          "linear-gradient(to bottom, #FFFFFF, rgba(255, 255, 255, 0.75))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
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
    require("tailwindcss-animate"),
  ],
};
