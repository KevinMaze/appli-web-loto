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
        // Palette principale – Loto
        loto: {
          primary: "#E63946",
          secondary: "#1D3557",
          accent: "#F4A261",
        },
        // Palette principale – EuroMillions
        euro: {
          primary: "#2563EB",
          secondary: "#1E1B4B",
          accent: "#FBBF24",
        },
        // Couleurs de fond globales
        surface: {
          DEFAULT: "#0F0F14",
          card: "#16161F",
          elevated: "#1E1E2E",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-loto": "linear-gradient(135deg, #E63946 0%, #1D3557 100%)",
        "gradient-euro": "linear-gradient(135deg, #2563EB 0%, #1E1B4B 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
