import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#FF6B35",
          dark: "#E55A2B",
        },
        secondary: {
          DEFAULT: "#DC2626",
          dark: "#B91C1C",
        },
        dark: {
          DEFAULT: "#1A1A2E",
          light: "#25253D",
          lighter: "#2D2D44",
        },
      },
    },
  },
  plugins: [],
};
export default config;
