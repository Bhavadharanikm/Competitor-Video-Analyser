"use client";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import PinGate, { isCmsUnlocked } from "@/components/cms/PinGate";
import ContentCalendar from "@/components/cms/ContentCalendar";

export default function CmsPage() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUnlocked(isCmsUnlocked());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!unlocked) {
    return (
      <AnimatePresence>
        <PinGate
          onClose={() => router.push("/")}
          onSuccess={() => setUnlocked(true)}
        />
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-[1760px] mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Content Management System</p>
            <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Content Calendar</h1>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-[10px] text-[12px] font-semibold cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
          >
            ← Back to Video Analyser
          </button>
        </div>

        <ContentCalendar />
      </div>
    </div>
  );
}
