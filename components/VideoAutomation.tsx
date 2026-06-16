"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVE_COLOR = "#F59E0B";
const ACTIVE_GLOW  = "rgba(245,158,11,0.25)";
const CARD_BORDER  = "rgba(245,158,11,0.3)";

const CLIENT_NAMES = ["FLOHOM", "Myrinn", "Paradise Pointe"];

interface SheetRow {
  [key: string]: string;
}

type Step = "idle" | "running" | "done" | "error";

export default function VideoAutomation() {
  const [rows, setRows]           = useState<SheetRow[]>([]);
  const [headers, setHeaders]     = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selected, setSelected]     = useState<SheetRow | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [clientName, setClientName] = useState(CLIENT_NAMES[0]);
  const [hook, setHook]           = useState("");
  const [cta, setCta]             = useState("");

  const [step, setStep]           = useState<Step>("idle");
  const [errMsg, setErrMsg]       = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Fetch sheet data
  useEffect(() => {
    fetch("/api/sheet")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setFetchError(data.error); }
        else {
          setHeaders(data.headers ?? []);
          setRows(data.rows ?? []);
          if (data.rows?.length) setSelectedFile(data.rows[0][data.headers[0]] ?? "");
        }
        setLoading(false);
      })
      .catch(() => { setFetchError("Could not load sheet data."); setLoading(false); });
  }, []);

  const clientKey = headers[0] ?? "";

  const handleClientChange = (name: string) => {
    setClientName(name);
  };

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const handleSubmit = async () => {
    if (!clientName || !hook || !cta) return;
    setStep("running");
    setErrMsg(null);
    timersRef.current.push(setTimeout(() => {}, 1000));

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "automation", clientName, openingHook: hook, cta }),
      });
      clearTimers();
      if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
      setStep("done");
    } catch (err: unknown) {
      clearTimers();
      setStep("error");
      setErrMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleReset = () => { clearTimers(); setStep("idle"); setErrMsg(null); setHook(""); setCta(""); };

  const running = step === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55 }}
      className="rounded-3xl overflow-hidden mb-8"
      style={{ background: "var(--surface)", border: `1px solid ${CARD_BORDER}` }}
    >
      {/* Header */}
      <div className="flex items-center px-7 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2.5 text-[12px] font-semibold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACTIVE_COLOR, boxShadow: `0 0 8px ${ACTIVE_COLOR}`, animation: "blink 2s ease-in-out infinite" }} />
          Video Automation
        </div>
      </div>

      {/* Body */}
      <div className="px-7 py-8 flex flex-col gap-5">

        {/* Client dropdown */}
        <div>
          <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
            Client
          </label>
          <select
            value={clientName}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={running}
            className="w-full rounded-[10px] px-4 py-3 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
            style={{
              background: "var(--bg)",
              border: `1px solid ${ACTIVE_COLOR}`,
              color: "var(--text)",
              boxShadow: `0 0 12px ${ACTIVE_GLOW}`,
            }}
          >
            {CLIENT_NAMES.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Opening Hook */}
        <div>
          <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
            Opening Hook
          </label>
          <textarea
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder="What grabs attention in the first 3 seconds…"
            rows={3}
            disabled={running}
            className="w-full rounded-[10px] px-4 py-3 text-[13px] outline-none resize-none transition-colors duration-200 disabled:opacity-50"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = ACTIVE_COLOR)}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* CTA */}
        <div>
          <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
            CTA
          </label>
          <input
            type="text"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="What should viewers do next…"
            disabled={running}
            className="w-full rounded-[10px] px-4 py-3 text-[13px] outline-none transition-colors duration-200 disabled:opacity-50"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = ACTIVE_COLOR)}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Competitor Structure */}
        <div>
          <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
            Competitor Structure
          </label>
          {loading ? (
            <div className="h-11 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
          ) : fetchError ? (
            <p className="text-[12px]" style={{ color: "#EF4444" }}>{fetchError}</p>
          ) : (
            <>
              <select
                value={selectedFile}
                onChange={(e) => {
                  setSelectedFile(e.target.value);
                }}
                disabled={running}
                className="w-full rounded-[10px] px-4 py-3 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                style={{
                  background: "var(--bg)",
                  border: `1px solid ${ACTIVE_COLOR}`,
                  color: "var(--text)",
                  boxShadow: `0 0 12px ${ACTIVE_GLOW}`,
                }}
              >
                {rows.map((row, i) => (
                  <option key={i} value={row[clientKey]}>{row[clientKey]}</option>
                ))}
              </select>
              {selectedFile && (
                <button
                  onClick={() => {
                    const row = rows.find((r) => r[clientKey] === selectedFile);
                    if (row) setSelected(row);
                  }}
                  className="mt-2 text-[11px] font-semibold transition-colors"
                  style={{ color: ACTIVE_COLOR }}
                >
                  View client details →
                </button>
              )}
            </>
          )}
        </div>

        {errMsg && <p className="text-[12px]" style={{ color: "#EF4444" }}>{errMsg}</p>}

        {/* Submit */}
        <div className="flex justify-end">
          {step === "done" ? (
            <button onClick={handleReset} className="px-6 py-3 rounded-[10px] text-[13px] font-semibold" style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}>
              New
            </button>
          ) : (
            <button
              onClick={running ? handleReset : handleSubmit}
              disabled={!running && (!clientName || !hook || !cta)}
              className="px-6 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all disabled:opacity-40"
              style={running
                ? { border: "1px solid var(--border)", color: "var(--muted)", background: "none" }
                : { background: ACTIVE_COLOR, color: "#fff", boxShadow: `0 0 20px ${ACTIVE_GLOW}`, border: "none" }}
            >
              {running ? "Cancel" : "Run Automation →"}
            </button>
          )}
        </div>
      </div>

      {/* Client detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden"
              style={{ background: "var(--surface)", border: `1px solid ${CARD_BORDER}`, maxHeight: "80vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-7 py-5 sticky top-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--muted)" }}>Client Details</p>
                  <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{selected[clientKey]}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] transition-colors cursor-pointer"
                  style={{ background: "var(--surface2)", color: "var(--muted)" }}
                >
                  ✕
                </button>
              </div>

              {/* Modal body — all fields */}
              <div className="px-7 py-6 flex flex-col gap-4">
                {headers.map((h) => (
                  selected[h] ? (
                    <div key={h}>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)", fontFamily: "JetBrains Mono, monospace" }}>{h}</p>
                      <p className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>{selected[h]}</p>
                    </div>
                  ) : null
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

