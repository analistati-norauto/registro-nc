import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marinho: {
          DEFAULT: "#0B2545",
          light: "#13315C",
          dark: "#071A33",
        },
        amarelo: {
          DEFAULT: "#FFC72C",
          dark: "#E6A800",
        },
      },
    },
  },
  plugins: [],
};
export default config;
