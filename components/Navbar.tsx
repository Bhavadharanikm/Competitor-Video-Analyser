"use client";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5"
      style={{
        backdropFilter: "blur(20px)",
        background: "rgba(255,255,255,0.85)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-2.5" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
        <motion.span
          className="w-2 h-2 rounded-full"
          style={{
            background: "var(--active-color)",
            boxShadow: "0 0 12px var(--active-color)",
            animation: "pulse-dot 2s ease-in-out infinite",
          }}
        />
        AI Video Analyser
      </div>
      <span
        className="text-[11px] font-medium tracking-widest uppercase px-2.5 py-1 rounded-full"
        style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
      >
        Hidden Gem Media
      </span>
    </motion.nav>
  );
}
