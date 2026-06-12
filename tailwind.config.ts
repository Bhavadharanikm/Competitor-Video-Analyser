import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream:   "#FEF6EE",
        card:    "#FFFCF8",
        bark:    "#2C1A0E",
        mist:    "#A8896E",
        line:    "#EDE0D4",
        coral:   "#1A4D35",
        coralDp: "#122E20",
        sage:    "#6A9E7F",
        sageDp:  "#4E7D63",
        amber:   "#F4C27B",
        lavender:"#C4B5D4",
      },
      fontFamily: {
        display: ["'Nunito'", "sans-serif"],
        body:    ["'Nunito Sans'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        soft:  "0 2px 16px -4px rgba(44,26,14,0.10), 0 1px 4px -2px rgba(44,26,14,0.06)",
        warm:  "0 4px 24px -6px rgba(232,115,90,0.22)",
      },
    },
  },
  plugins: [],
};
export default config;
