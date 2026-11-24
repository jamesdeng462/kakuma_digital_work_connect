import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f3",
          100: "#d5efe2",
          200: "#acdec6",
          300: "#76c6a3",
          400: "#43a77e",
          500: "#238b63",
          600: "#17704f",
          700: "#135a41",
          800: "#124835",
          900: "#0f3b2d",
        },
        sun: {
          100: "#fdf0d8",
          400: "#f0a83a",
          500: "#e08f1b",
          700: "#9a5a0a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
