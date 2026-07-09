"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Tab } from "./TabSwitcher";

interface Props {
  activeTab: Tab;
  onResult: (data: Record<string, unknown>, name: string) => void;
}

const BASE_CLIENT_NAMES = ["FLOHOM", "Paradise Pointe", "Awayframes"];

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

interface AnalysisJob {
  id: string;
  client_slug: string;
  property_tag: string | null;
  file_name: string;
  status: string;
  message: string;
  updated_at: string;
}

export default function UploadZone({ activeTab, onResult }: Props) {
  const [url, setUrl]           = useState("");
  const [step, setStep]         = useState<Step>("idle");
  const [errMsg, setErrMsg]     = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [clients, setClients]   = useState<string[]>(BASE_CLIENT_NAMES);
  const [clientName, setClientName] = useState(BASE_CLIENT_NAMES[0]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");

  const [allProperties, setAllProperties]       = useState<Record<string, string[]>>({});
  const [properties, setProperties]             = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [propsLoading, setPropsLoading]         = useState(true);
  const [showAddProp, setShowAddProp]           = useState(false);
  const [newPropName, setNewPropName]           = useState("");

  const [history, setHistory]             = useState<AnalysisJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const historyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("clientNames");
    if (saved) {
      const parsed: string[] = JSON.parse(saved);
      setClients(parsed);
      setClientName(parsed[0]);
    }
  }, []);

  // Fetch all properties once on mount
  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => {
        const all: Record<string, string[]> = data.properties ?? {};
        setAllProperties(all);
        setPropsLoading(false);
      })
      .catch(() => setPropsLoading(false));
  }, []);

  // Filter locally when client changes
  useEffect(() => {
    const props = allProperties[clientName] ?? [];
    setProperties(props);
    setSelectedProperty(props[0] ?? "");
  }, [clientName, allProperties]);

  const fetchHistory = () => {
    if (activeTab !== "client") return;
    setHistoryLoading(true);
    fetch(`/api/analysis-history?clientName=${encodeURIComponent(clientName)}`)
      .then((r) => r.json())
      .then((data) => setHistory(data.history ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, [activeTab, clientName]);

  const handleAddClient = () => {
    const name = newClientName.trim();
    if (!name || clients.includes(name)) return;
    const updated = [...clients, name];
    setClients(updated);
    setClientName(name);
    localStorage.setItem("clientNames", JSON.stringify(updated));
    setNewClientName("");
    setShowAddClient(false);
  };

  const handleAddProperty = () => {
    const name = newPropName.trim();
    if (!name || properties.includes(name)) return;
    const updated = [...properties, name].sort();
    setProperties(updated);
    setSelectedProperty(name);
    setNewPropName("");
    setShowAddProp(false);
  };

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

  const runAnalysis = async (payload: Record<string, unknown>, displayName: string) => {
    setStep("load");
    setErrMsg(null);
    triggerScanBeam();
    fakeProgress();

    // The analyse webhook blocks until n8n finishes, so poll Reel_Jobs in the
    // background to show the row n8n writes (and later updates) in real time.
    if (activeTab === "client") {
      fetchHistory();
      if (historyPollRef.current) clearInterval(historyPollRef.current);
      historyPollRef.current = setInterval(fetchHistory, 5000);
    }

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          type: activeTab,
          ...(activeTab === "client"
            ? { run_id: crypto.randomUUID(), fileName: displayName, clientName, property: selectedProperty }
            : {}),
        }),
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
    } finally {
      if (historyPollRef.current) { clearInterval(historyPollRef.current); historyPollRef.current = null; }
      fetchHistory();
    }
  };

  const handleGo = () => {
    if (!url.trim() || running) return;
    const name = url.split("/d/")[1]?.split("/")[0] ?? "clip";
    runAnalysis({ url }, `${name}.mp4`);
  };

  const handleReset = () => {
    clearTimers();
    if (historyPollRef.current) { clearInterval(historyPollRef.current); historyPollRef.current = null; }
    setStep("idle");
    setErrMsg(null);
    setUrl("");
    setHistory([]);
  };

  const running   = step === "load" || step === "process" || step === "analyse";
  const stepIndex = STEPS.findIndex((s) => s.key === step);

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
              className="flex items-center gap-2 relative"
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
                {clients.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              {/* Add client button */}
              <button
                onClick={() => setShowAddClient((v) => !v)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[16px] font-bold transition-all cursor-pointer"
                style={{
                  background: "var(--surface2)",
                  border: `1px solid ${activeColor}`,
                  color: activeColor,
                  boxShadow: `0 0 8px ${activeGlow}`,
                }}
                title="Add new client"
              >
                +
              </button>

              {/* Add client popup */}
              <AnimatePresence>
                {showAddClient && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-10 z-50 rounded-2xl p-4 flex flex-col gap-3 shadow-xl"
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${activeColor}`,
                      boxShadow: `0 0 24px ${activeGlow}`,
                      minWidth: 220,
                    }}
                  >
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>New Client</p>
                    <input
                      autoFocus
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                      placeholder="Client name…"
                      className="rounded-[8px] px-3 py-2 text-[12px] outline-none"
                      style={{
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = activeColor)}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddClient}
                        disabled={!newClientName.trim()}
                        className="flex-1 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer disabled:opacity-40"
                        style={{ background: activeColor, color: "#fff", border: "none" }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowAddClient(false); setNewClientName(""); }}
                        className="flex-1 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer"
                        style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Property dropdown — only on Client tab */}
      <AnimatePresence>
        {activeTab === "client" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="px-7 py-4 relative"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Property</p>
            <div className="flex items-center gap-2 relative">
              {propsLoading ? (
                <div className="flex-1 h-10 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
              ) : (
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  disabled={running || properties.length === 0}
                  className="flex-1 rounded-[10px] px-4 py-2.5 text-[12px] font-medium outline-none cursor-pointer disabled:opacity-50"
                  style={{
                    background: "var(--bg)",
                    border: `1px solid ${activeColor}`,
                    color: "var(--text)",
                    boxShadow: `0 0 10px ${activeGlow}`,
                  }}
                >
                  {properties.length === 0
                    ? <option value="">No properties yet</option>
                    : properties.map((p) => <option key={p} value={p}>{p}</option>)
                  }
                </select>
              )}

              <button
                onClick={() => setShowAddProp((v) => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] font-bold cursor-pointer flex-shrink-0"
                style={{
                  background: "var(--surface2)",
                  border: `1px solid ${activeColor}`,
                  color: activeColor,
                  boxShadow: `0 0 8px ${activeGlow}`,
                }}
                title="Add property tag"
              >
                +
              </button>

              <AnimatePresence>
                {showAddProp && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-10 z-50 rounded-2xl p-4 flex flex-col gap-3 shadow-xl"
                    style={{
                      background: "var(--surface)",
                      border: `1px solid ${activeColor}`,
                      boxShadow: `0 0 24px ${activeGlow}`,
                      minWidth: 240,
                    }}
                  >
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
                      New Property — {clientName}
                    </p>
                    <input
                      autoFocus
                      type="text"
                      value={newPropName}
                      onChange={(e) => setNewPropName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddProperty()}
                      placeholder="e.g. FLO17, Mountain Cabin…"
                      className="rounded-[8px] px-3 py-2 text-[12px] outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                      onFocus={(e) => (e.target.style.borderColor = activeColor)}
                      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddProperty}
                        disabled={!newPropName.trim()}
                        className="flex-1 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer disabled:opacity-40"
                        style={{ background: activeColor, color: "#fff", border: "none" }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowAddProp(false); setNewPropName(""); }}
                        className="flex-1 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer"
                        style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL input row */}
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

        <div className="flex gap-2.5">
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
          ) : (
            <button
              onClick={handleGo}
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

      {/* Analysis tracker — Client tab only */}
      {activeTab === "client" && (
        <div className="px-7 py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>
            Tracking — {clientName}
          </p>
          {historyLoading && history.length === 0 ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-14 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--muted)", opacity: 0.6 }}>No videos analysed yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...history].reverse().map((job) => {
                const isDone   = job.status === "completed";
                const isFailed = job.status === "failed";
                return (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 rounded-[10px] px-4 py-3"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                      style={{
                        background: isDone ? "rgba(34,197,94,0.12)" : isFailed ? "rgba(239,68,68,0.1)" : activeGlow,
                        color: isDone ? "#22C55E" : isFailed ? "#EF4444" : activeColor,
                        border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : isFailed ? "rgba(239,68,68,0.2)" : activeColor}`,
                      }}
                    >
                      {isDone ? "✓" : isFailed ? "✕" : "…"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{job.file_name || "Untitled clip"}</p>
                    </div>
                    <p className="text-[10px] font-mono flex-shrink-0" style={{ color: "var(--muted)", opacity: 0.5 }}>
                      {new Date(job.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
