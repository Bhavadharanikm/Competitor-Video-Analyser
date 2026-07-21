"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import PinGate, { isCmsUnlocked } from "./cms/PinGate";

export default function Navbar() {
  const router = useRouter();
  const [showPinGate, setShowPinGate] = useState(false);

  const handleAvatarClick = () => {
    if (isCmsUnlocked()) {
      router.push("/cms");
    } else {
      setShowPinGate(true);
    }
  };

  return (
    <>
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
      style={{
        backdropFilter: "blur(20px)",
        background: "rgba(255,255,255,0.92)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo + title */}
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#2563EB" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 8l9 14 9-14-9-6z" fill="white" opacity="0.9"/>
            <path d="M3 8h18M12 2L6.5 8l5.5 14 5.5-14L12 2z" stroke="white" strokeWidth="0.5" opacity="0.4"/>
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-bold leading-tight" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>Video Analyser</p>
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>Hidden Gem Media</p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          All systems ready
        </div>
        <button
          onClick={handleAvatarClick}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0 cursor-pointer"
          style={{ background: "#2563EB", border: "none" }}
        >
          HG
        </button>
      </div>

    </motion.nav>

    <AnimatePresence>
      {showPinGate && (
        <PinGate
          onClose={() => setShowPinGate(false)}
          onSuccess={() => {
            setShowPinGate(false);
            router.push("/cms");
          }}
        />
      )}
    </AnimatePresence>
    </>
  );
}
