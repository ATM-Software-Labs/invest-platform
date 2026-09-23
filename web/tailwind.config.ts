import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0b0f17",
          elev: "#0d1117",
          card: "#0f172a",
          border: "rgba(30, 41, 59, 0.8)",
          muted: "#94a3b8",
          ink: "#f8fafc",
        },
        signal: {
          up: "#34d399",
          upDeep: "#10b981",
          down: "#fb7185",
          ruby: "#f43f5e",
          warn: "#fbbf24",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      boxShadow: {
        terminal: "0 0 0 1px rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
