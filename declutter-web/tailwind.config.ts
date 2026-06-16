import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-satoshi)", "Satoshi", "system-ui", "sans-serif"]
      },
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          foreground: "var(--brand-foreground)",
          soft: "var(--brand-soft)"
        },
        canvas: "var(--background)",
        surface: "var(--surface)"
      },
      borderRadius: {
        brand: "var(--radius)"
      },
      ringColor: {
        brand: "var(--ring)"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
