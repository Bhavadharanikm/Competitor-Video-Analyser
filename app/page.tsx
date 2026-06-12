"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import TabSwitcher, { type Tab } from "@/components/TabSwitcher";
import UploadZone from "@/components/UploadZone";
import RecentFiles, { type VideoFile } from "@/components/RecentFiles";

const SEED: VideoFile[] = [
  { name: "mirrored-cabin-giveaway.mp4", type: "competitor", size: "24.1 MB", when: "Today · 7:42 PM",      source: "drive"  },
  { name: "hot-tub-sunset-reel.mp4",     type: "client",     size: "18.7 MB", when: "Today · 6:15 PM",      source: "upload" },
  { name: "lakehouse-walkthrough.mp4",   type: "client",     size: "31.2 MB", when: "Yesterday · 2:08 PM",  source: "drive"  },
  { name: "treehouse-tour-ig.mp4",       type: "competitor", size: "12.4 MB", when: "Yesterday · 11:30 AM", source: "upload" },
];

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("competitor");
  const [files, setFiles]         = useState<VideoFile[]>(SEED);
  const [analysis, setAnalysis]   = useState<Record<string, unknown> | null>(null);
  const [analysedName, setAnalysedName] = useState<string | null>(null);

  const activeColor = activeTab === "competitor" ? "#6366F1" : "#00D4A0";
  const activeGlow  = activeTab === "competitor" ? "rgba(99,102,241,0.25)" : "rgba(0,212,160,0.22)";

  const handleResult = (data: Record<string, unknown>, name: string) => {
    setAnalysis(data);
    setAnalysedName(name);
    setFiles((prev) => [
      { name, type: activeTab, size: "—", when: `Today · ${now()}`, source: "drive" },
      ...prev,
    ]);
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
      <div className="relative z-10 max-w-[1100px] mx-auto px-10 pt-36 pb-20">

        <HeroSection activeTab={activeTab} />
        <TabSwitcher active={activeTab} onChange={handleTabChange} />
        <UploadZone activeTab={activeTab} onResult={handleResult} />

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

        <RecentFiles files={files} activeTab={activeTab} onRerun={(f) => setActiveTab(f.type)} />
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
