"use client";
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

export type Tab = "competitor" | "client" | "automation";

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
}

const tabs: { id: Tab; label: string }[] = [
  { id: "competitor", label: "🎯 Competitor Analyser" },
  { id: "client",     label: "✨ Client Analyser"     },
  { id: "automation", label: "⚡ Video Automation"    },
];

export default function TabSwitcher({ active, onChange }: Props) {
  const compRef       = useRef<HTMLButtonElement>(null);
  const clientRef     = useRef<HTMLButtonElement>(null);
  const automationRef = useRef<HTMLButtonElement>(null);
  const refs = [compRef, clientRef, automationRef];
  const [pill, setPill] = useState({ x: 0, w: 0 });

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.id === active);
    const ref = refs[idx];
    if (ref?.current) {
      const btn = ref.current;
      const parent = btn.parentElement!;
      const parentRect = parent.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPill({ x: btnRect.left - parentRect.left - 4, w: btn.offsetWidth });
    }
  }, [active]);

  const activeColor =
    active === "competitor" ? "#6366F1" :
    active === "client"     ? "#00D4A0" : "#F59E0B";
  const activeGlow =
    active === "competitor" ? "rgba(99,102,241,0.25)" :
    active === "client"     ? "rgba(0,212,160,0.22)"  : "rgba(245,158,11,0.25)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.45 }}
      className="flex justify-center mb-8"
    >
      <div
        className="relative inline-flex p-1 rounded-xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Sliding pill */}
        <motion.div
          className="absolute top-1 rounded-[10px]"
          animate={{ x: pill.x, width: pill.w }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          style={{
            height: "calc(100% - 8px)",
            background: activeColor,
            boxShadow: `0 0 24px ${activeGlow}`,
          }}
        />

        {tabs.map((tab, i) => {
          const isActive = active === tab.id;
          const ref = refs[i];
          return (
            <button
              key={tab.id}
              ref={ref}
              onClick={() => onChange(tab.id)}
              className="relative z-10 text-[13px] font-semibold px-7 py-3 rounded-[10px] transition-colors duration-300 cursor-pointer"
              style={{ color: isActive ? "#fff" : "var(--muted)", whiteSpace: "nowrap" }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
