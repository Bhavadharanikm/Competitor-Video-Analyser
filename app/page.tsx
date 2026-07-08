"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TabSwitcher, { type Tab } from "@/components/TabSwitcher";
import UploadZone from "@/components/UploadZone";
import VideoAutomation from "@/components/VideoAutomation";

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("competitor");
  const [analysis, setAnalysis]   = useState<Record<string, unknown> | null>(null);
  const [analysedName, setAnalysedName] = useState<string | null>(null);

  const activeColor = activeTab === "competitor" ? "#6366F1" : "#00D4A0";
  const activeGlow  = activeTab === "competitor" ? "rgba(99,102,241,0.25)" : "rgba(0,212,160,0.22)";

  const handleResult = (data: Record<string, unknown>, name: string) => {
    setAnalysis(data);
    setAnalysedName(name);
  };

  const handleTabChange = (t: Tab) => {
    setActiveTab(t);
    setAnalysis(null);
  };

  return (
    <div
      className="min-h-screen relative"
      style={{
        "--active-color": activeColor,
        "--active-glow":  activeGlow,
      } as React.CSSProperties}
    >
      {/* Background orbs */}
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 600, height: 600,
          top: -200, right: -200,
          background: `radial-gradient(circle, ${activeTab === "competitor" ? "rgba(99,102,241,0.08)" : "rgba(0,212,160,0.07)"} 0%, transparent 70%)`,
          filter: "blur(120px)",
          transition: "background 0.6s",
        }}
      />
      <div
        className="fixed rounded-full pointer-events-none z-0"
        style={{
          width: 400, height: 400,
          bottom: 0, left: -100,
          background: "radial-gradient(circle, rgba(0,212,160,0.05) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
      />

      <Navbar />

      {/* Main content */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-12 pt-24 pb-20">

        {/* Mini hero */}
        <div className="text-center mb-8 pt-6">
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>AI Video Analyser</p>
          <h1 className="text-[32px] font-bold tracking-tight mb-6" style={{ color: "var(--text)", letterSpacing: "-0.02em" }}>What would you like to run?</h1>
          <TabSwitcher active={activeTab} onChange={handleTabChange} />
        </div>
        {activeTab === "automation"
          ? <VideoAutomation />
          : <UploadZone activeTab={activeTab} onResult={handleResult} />
        }

        {/* Analysis results */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl overflow-hidden mb-8"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="text-[12px] font-semibold tracking-widest uppercase" style={{ color: "var(--text)" }}>
                  Analysis Results
                </span>
                {analysedName && (
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--muted)" }}>
                    {analysedName}
                  </span>
                )}
              </div>
              <div className="px-7 py-5">
                <AnalysisView data={analysis} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <footer
        className="relative z-10 text-center py-10"
        style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em" }}
      >
        made for hidden gem media · ai video analyser
      </footer>
    </div>
  );
}

function AnalysisView({ data }: { data: Record<string, unknown> }) {
  const text =
    (data.analysis as string) ||
    (data.result   as string) ||
    (data.summary  as string) ||
    (data.output   as string);

  if (text) {
    return (
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", whiteSpace: "pre-wrap" }}>{text}</p>
    );
  }

  const fields = Object.entries(data).filter(([k]) => k !== "analysed");

  return (
    <div className="flex flex-col gap-4">
      {fields.map(([k, v]) => (
        <div key={k} className="flex items-start gap-5">
          <span
            className="text-[10px] font-semibold tracking-widest uppercase pt-0.5 flex-shrink-0"
            style={{ color: "var(--muted)", width: 90, fontFamily: "JetBrains Mono, monospace" }}
          >
            {k}
          </span>
          <span style={{ fontSize: 14, color: "var(--text)" }}>
            {typeof v === "object" ? (
              <pre style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                {JSON.stringify(v, null, 2)}
              </pre>
            ) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}
