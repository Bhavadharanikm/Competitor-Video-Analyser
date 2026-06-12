"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tab } from "./TabSwitcher";

interface Props {
  activeTab: Tab;
  onResult: (data: Record<string, unknown>, name: string) => void;
}

const folderMap: Record<Tab, string> = {
  competitor: "Competitor Clips",
  client:     "Client Reels",
};

const modeLabelMap: Record<Tab, string> = {
  competitor: "Competitor Analysis",
  client:     "Client Analysis",
};

const step3Sub: Record<Tab, string> = {
  competitor: "Running AI analysis",
  client:     "Generating insights",
};

type Step = "idle" | "load" | "process" | "analyse" | "done" | "error";
const STEPS = [
  { key: "load",    label: "Load",    sub: "Reading your video"    },
  { key: "process", label: "Process", sub: "Saving to Google Drive" },
  { key: "analyse", label: "Analyse", sub: ""                       },
];

export default function UploadZone({ activeTab, onResult }: Props) {
  const [url, setUrl]         = useState("");
  const [isDragging, setDrag] = useState(false);
  const [step, setStep]       = useState<Step>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeColor = activeTab === "competitor" ? "#6366F1" : "#00D4A0";
  const activeGlow  = activeTab === "competitor" ? "rgba(99,102,241,0.25)" : "rgba(0,212,160,0.22)";
  const cardBorder  = activeTab === "competitor" ? "rgba(99,102,241,0.3)" : "rgba(0,212,160,0.25)";

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const fakeProgress = () => {
    timersRef.current.push(setTimeout(() => setStep("process"), 1100));
    timersRef.current.push(setTimeout(() => setStep("analyse"), 2400));
  };

  const triggerScanBeam = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2100);
  };

  const runAnalysis = async (payload: Record<string, unknown>, displayName: string) => {
    setStep("load");
    setErrMsg(null);
    triggerScanBeam();
    fakeProgress();

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, type: activeTab }),
      });
      clearTimers();
      if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
      const data = await res.json();
      setStep("done");
      setFileName(displayName);
      onResult(data, displayName);
    } catch (err: unknown) {
      clearTimers();
      setStep("error");
      setErrMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleGo = () => {
    if (!url.trim() || running) return;
    const name = url.split("/d/")[1]?.split("/")[0] ?? "clip";
    runAnalysis({ url }, `${name}.mp4`);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    runAnalysis({ fileName: file.name, fileSize: file.size }, file.name);
  };

  const handleReset = () => {
    clearTimers();
    setStep("idle");
    setFileName(null);
    setErrMsg(null);
    setUrl("");
  };

  const running    = step === "load" || step === "process" || step === "analyse";
  const stepIndex  = STEPS.findIndex((s) => s.key === step);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55 }}
      className="rounded-3xl overflow-hidden mb-8"
      style={{ background: "var(--surface)", border: `1px solid ${cardBorder}`, transition: "border-color 0.4s" }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-7 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2.5 text-[12px] font-semibold tracking-widest uppercase">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}`, animation: "blink 2s ease-in-out infinite" }}
          />
          {modeLabelMap[activeTab]}
        </div>
        <div className="flex items-center gap-2" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--muted)" }}>
          Saving to{" "}
          <motion.strong key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "var(--text)", fontWeight: 500 }}>
            {folderMap[activeTab]}
          </motion.strong>
          <button
            className="text-[11px] px-2.5 py-0.5 rounded-md transition-colors cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
          >
            Change
          </button>
        </div>
      </div>

      {/* Upload zone */}
      <div className="relative px-7 py-12 overflow-hidden">
        {/* Scan beam */}
        <div
          className="absolute top-0 h-full pointer-events-none"
          style={{
            width: "60%",
            background: `linear-gradient(90deg, transparent, ${activeGlow}, transparent)`,
            animation: scanning ? "scan 2s ease-in-out" : "none",
            left: scanning ? undefined : "-100%",
          }}
        />

        {/* Drop area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault(); setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f?.type.startsWith("video/")) handleFile(f);
          }}
          onClick={() => step === "idle" && fileRef.current?.click()}
          className="rounded-2xl text-center cursor-pointer transition-all duration-300"
          style={{
            border: `1.5px dashed ${isDragging ? activeColor : "var(--border-bright)"}`,
            background: isDragging ? "rgba(255,255,255,0.02)" : "transparent",
            padding: "40px 40px 32px",
          }}
        >
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

          {/* Icon */}
          <AnimatePresence mode="wait">
            {step === "done" ? (
              <motion.div key="done" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                className="w-14 h-14 rounded-2xl inline-flex items-center justify-center text-2xl mb-4"
                style={{ background: "var(--surface2)", border: `1px solid ${activeColor}`, boxShadow: `0 0 20px ${activeGlow}` }}
              >✓</motion.div>
            ) : step === "error" ? (
              <motion.div key="err" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                className="w-14 h-14 rounded-2xl inline-flex items-center justify-center text-2xl mb-4"
                style={{ background: "var(--surface2)", border: "1px solid rgba(239,68,68,0.4)" }}
              >✕</motion.div>
            ) : (
              <motion.div key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-14 h-14 rounded-2xl inline-flex items-center justify-center text-2xl mb-4"
                style={{ background: "var(--surface2)", border: `1px solid var(--border)`, transition: `border-color 0.3s, box-shadow 0.3s` }}
              >🎬</motion.div>
            )}
          </AnimatePresence>

          <p className="text-[15px] font-medium mb-1.5" style={{ color: "var(--text)" }}>
            {step === "done" && fileName ? fileName
              : step === "error" ? "Upload failed"
              : fileName && running ? fileName
              : "Drop your video here"}
          </p>
          <p className="text-[12px] mb-6" style={{ color: "var(--muted)" }}>
            {step === "error" ? (errMsg ?? "Try again") : "MP4, MOV, or any video format · up to 2GB"}
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em" }}>
              or paste a link
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* URL row */}
          <div className="flex gap-2.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGo()}
              placeholder="https://drive.google.com/file/d/…"
              disabled={running}
              className="flex-1 rounded-[10px] px-4 py-3 text-[12px] outline-none transition-colors duration-200 disabled:opacity-50"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontFamily: "JetBrains Mono, monospace",
              }}
              onFocus={(e) => (e.target.style.borderColor = activeColor)}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            {running ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="px-5 py-3 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
              >
                Cancel
              </button>
            ) : step === "done" ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleReset(); }}
                className="px-5 py-3 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer"
                style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
              >
                New
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleGo(); }}
                disabled={!url.trim()}
                className="px-5 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all disabled:opacity-40"
                style={{ background: activeColor, color: "#fff", boxShadow: `0 0 20px ${activeGlow}`, border: "none" }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = ""; }}
              >
                Analyse →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex" style={{ borderTop: "1px solid var(--border)" }}>
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone   = (running || step === "done") && stepIndex > i;
          const sub      = s.key === "analyse" ? step3Sub[activeTab] : s.sub;

          return (
            <div
              key={s.key}
              className="flex-1 flex items-center gap-3 px-5 py-4 transition-colors duration-200"
              style={{
                borderRight: i < 2 ? "1px solid var(--border)" : "none",
                background: isActive ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-400"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  border: `1.5px solid ${(isActive || isDone) ? activeColor : "var(--border)"}`,
                  color: (isActive || isDone) ? activeColor : "var(--muted)",
                  background: (isActive || isDone) ? activeGlow : "transparent",
                  boxShadow: (isActive || isDone) ? `0 0 12px ${activeGlow}` : "none",
                }}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "var(--text)", marginBottom: 2 }}>{s.label}</p>
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>{sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
