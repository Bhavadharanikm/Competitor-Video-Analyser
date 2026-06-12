import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2F4F2",
        ink: "#0C1F18",
        pine: "#11342A",
        emerald: "#0E7C56",
        emeraldDeep: "#0A5C40",
        amber: "#E3A14C",
        mist: "#7E978C",
        line: "#D8E0DB",
        card: "#FBFCFB",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
