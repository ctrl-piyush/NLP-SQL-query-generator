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
        brand: {
          50:  "#eef6ff",
          100: "#d9eaff",
          200: "#bbdaff",
          300: "#8ac2ff",
          400: "#529eff",
          500: "#2a77f5",
          600: "#1557ea",
          700: "#1243d7",
          800: "#1538ae",
          900: "#173389",
          950: "#121f54",
        },
        surface: {
          DEFAULT: "#0f1117",
          card:    "#161b27",
          border:  "#1e2535",
          hover:   "#1c2236",
        },
        accent: {
          cyan:   "#22d3ee",
          green:  "#4ade80",
          amber:  "#fbbf24",
          red:    "#f87171",
          purple: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(42,119,245,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(42,119,245,0.04) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(42,119,245,0.25), transparent)",
      },
      backgroundSize: {
        "grid-size": "40px 40px",
      },
      animation: {
        "fade-in":    "fadeIn 0.4s ease forwards",
        "slide-up":   "slideUp 0.4s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
