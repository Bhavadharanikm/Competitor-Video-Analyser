"use client";
import { motion } from "framer-motion";

interface Props {
  activeTab: "competitor" | "client";
}

const words = [
  { text: "Upload",  gradient: false },
  { text: "Analyse", gradient: true  },
  { text: "ACT.",    gradient: false },
];

export default function HeroSection({ activeTab }: Props) {
  return (
    <section className="text-center mb-14">
      {/* Eyebrow */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="inline-flex items-center gap-2 mb-7"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}
      >
        <span style={{ width: 24, height: 1, background: "var(--muted)", display: "inline-block" }} />
        Powered by AI
        <span style={{ width: 24, height: 1, background: "var(--muted)", display: "inline-block" }} />
      </motion.div>

      {/* Single-line headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1 }}
        style={{ fontSize: "clamp(40px, 6vw, 80px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 28, display: "flex", alignItems: "baseline", justifyContent: "center", gap: "0.25em", flexWrap: "wrap" }}
      >
        {words.map((w) => (
          <span
            key={w.text}
            style={w.gradient ? {
              background: "linear-gradient(135deg, var(--active-color) 0%, #00D4A0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            } : { color: "var(--text)" }}
          >
            {w.text}
          </span>
        ))}
      </motion.div>
      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}
      >
        Drop a Drive link or upload a clip — get instant AI insights on competitor and client content.
      </motion.p>
    </section>
  );
}
