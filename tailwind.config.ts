import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf8f2",
          100: "#f4eadf",
          200: "#ead8c6",
          300: "#d8bba1",
          400: "#c79e7d",
          500: "#a67752",
          600: "#8f6142",
          700: "#744f37",
          800: "#5f412f",
          900: "#4d3527"
        }
      }
    }
  },
  plugins: []
};

export default config;
