"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tab } from "./TabSwitcher";

interface Props {
  activeTab: Tab;
  onResult: (data: Record<string, unknown>, name: string) => void;
}

const CLIENT_NAMES = ["FLOHOM", "Paradise Pointe"];

const modeLabelMap: Record<Tab, string> = {
  competitor: "Competitor Analysis",
  client:     "Client Analysis",
  automation: "Video Automation",
};

const step3Sub: Record<Tab, string> = {
  competitor: "Running AI analysis",
  client:     "Generating insights",
  automation: "Building automation",
};

type Step = "idle" | "load" | "process" | "analyse" | "done" | "error";
const STEPS = [
  { key: "load",    label: "Load",    sub: "Reading your video"    },
  { key: "process", label: "Process", sub: "Saving to Google Drive" },
  { key: "analyse", label: "Analyse", sub: ""                       },
];

interface DriveFile { id: string; name: string; }

function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function UploadZone({ activeTab, onResult }: Props) {
  const [url, setUrl]               = useState("");
  const [step, setStep]             = useState<Step>("idle");
  const [errMsg, setErrMsg]         = useState<string | null>(null);
  const [scanning, setScanning]     = useState(false);
  const [clientName, setClientName] = useState(CLIENT_NAMES[0]);

  // Drive folder file picker (client tab only)
  const [driveFiles, setDriveFiles]         = useState<DriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [fetchingFiles, setFetchingFiles]   = useState(false);
  const [folderMode, setFolderMode]         = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeColor =
    activeTab === "competitor" ? "#6366F1" :
    activeTab === "client"     ? "#00D4A0" : "#F59E0B";
  const activeGlow =
    activeTab === "competitor" ? "rgba(99,102,241,0.25)" :
    activeTab === "client"     ? "rgba(0,212,160,0.22)"  : "rgba(245,158,11,0.25)";
  const cardBorder =
    activeTab === "competitor" ? "rgba(99,102,241,0.3)" :
    activeTab === "client"     ? "rgba(0,212,160,0.25)" : "rgba(245,158,11,0.3)";

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const fakeProgress = () => {
    timersRef.current.push(setTimeout(() => setStep("process"), 1100));
    timersRef.current.push(setTimeout(() => setStep("analyse"), 2400));
  };

  const triggerScanBeam = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2100);
  };

  const handleUrlChange = async (value: string) => {
    setUrl(value);
    setFolderMode(false);
    setDriveFiles([]);
    setSelectedFileId("");

    if (activeTab !== "client") return;

    const folderId = extractFolderId(value);
    if (!folderId) return;

    setFetchingFiles(true);
    setFolderMode(true);
    try {
      const res = await fetch(`/api/drive?folderId=${folderId}`);
      const data = await res.json();
      if (data.files?.length) {
        setDriveFiles(data.files);
        setSelectedFileId(data.files[0].id);
      } else {
        setErrMsg(data.error ?? "No files found in this folder.");
      }
    } catch {
      setErrMsg("Could not fetch folder contents.");
    } finally {
      setFetchingFiles(false);
    }
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
        body: JSON.stringify({ ...payload, type: activeTab, ...(activeTab === "client" ? { clientName } : {}) }),
      });
      clearTimers();
      if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
      const data = await res.json();
      setStep("done");
      onResult(data, displayName);
    } catch (err: unknown) {
      clearTimers();
      setStep("error");
      setErrMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleGo = () => {
    if (running) return;
    if (folderMode && selectedFileId) {
      const file = driveFiles.find((f) => f.id === selectedFileId);
      const fileUrl = `https://drive.google.com/file/d/${selectedFileId}/view`;
      runAnalysis({ url: fileUrl }, file?.name ?? `${selectedFileId}.mp4`);
    } else {
      if (!url.trim()) return;
      const fileId = extractFileId(url) ?? url;
      runAnalysis({ url }, `${fileId}.mp4`);
    }
  };

  const handleReset = () => {
    clearTimers();
    setStep("idle");
    setErrMsg(null);
    setUrl("");
    setDriveFiles([]);
    setSelectedFileId("");
    setFolderMode(false);
  };

  const running   = step === "load" || step === "process" || step === "analyse";
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const canGo     = folderMode ? !!selectedFileId : !!url.trim();

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

        {/* Client name dropdown — only on Client tab */}
        <AnimatePresence>
          {activeTab === "client" && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
            >
              <select
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold cursor-pointer outline-none transition-colors"
                style={{
                  background: "var(--surface2)",
                  border: `1px solid ${activeColor}`,
                  color: "var(--text)",
                  boxShadow: `0 0 10px ${activeGlow}`,
                }}
              >
                {CLIENT_NAMES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* URL input + file picker */}
      <div className="relative px-7 py-8 overflow-hidden">
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

        {errMsg && (
          <p className="text-[12px] mb-4" style={{ color: "#EF4444" }}>{errMsg}</p>
        )}

        {/* URL input row */}
        <div className="flex gap-2.5">
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !folderMode && handleGo()}
            placeholder="https://drive.google.com/drive/folders/… or /file/d/…"
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
              onClick={handleReset}
              className="px-5 py-3 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
            >
              Cancel
            </button>
          ) : step === "done" ? (
            <button
              onClick={handleReset}
              className="px-5 py-3 rounded-[10px] text-[13px] font-semibold transition-all cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
            >
              New
            </button>
          ) : !folderMode ? (
            <button
              onClick={handleGo}
              disabled={!canGo}
              className="px-5 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all disabled:opacity-40"
              style={{ background: activeColor, color: "#fff", boxShadow: `0 0 20px ${activeGlow}`, border: "none" }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = ""; }}
            >
              Analyse →
            </button>
          ) : null}
        </div>

        {/* File picker — shown after folder link is pasted */}
        <AnimatePresence>
          {folderMode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="mt-4"
            >
              {fetchingFiles ? (
                <div className="h-11 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
              ) : (
                <div className="flex gap-2.5">
                  <select
                    value={selectedFileId}
                    onChange={(e) => setSelectedFileId(e.target.value)}
                    disabled={running}
                    className="flex-1 rounded-[10px] px-4 py-3 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                    style={{
                      background: "var(--bg)",
                      border: `1px solid ${activeColor}`,
                      color: "var(--text)",
                      boxShadow: `0 0 12px ${activeGlow}`,
                    }}
                  >
                    {driveFiles.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleGo}
                    disabled={!selectedFileId || running}
                    className="px-5 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all disabled:opacity-40"
                    style={{ background: activeColor, color: "#fff", boxShadow: `0 0 20px ${activeGlow}`, border: "none" }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = ""; }}
                  >
                    Analyse →
                  </button>
                </div>
              )}
              <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
                {driveFiles.length} file{driveFiles.length !== 1 ? "s" : ""} found in folder
              </p>
            </motion.div>
          )}
        </AnimatePresence>
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
