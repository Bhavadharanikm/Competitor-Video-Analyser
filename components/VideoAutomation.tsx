"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVE_COLOR = "#F59E0B";
const ACTIVE_GLOW  = "rgba(245,158,11,0.25)";
const CARD_BORDER  = "rgba(245,158,11,0.3)";


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
  const [clientNames, setClientNames] = useState<string[]>([]);
  const [clientName, setClientName] = useState("");
  const [hook, setHook]           = useState("");
  const [cta, setCta]             = useState("");

  const [allProperties, setAllProperties]   = useState<Record<string, string[]>>({});
  const [properties, setProperties]         = useState<string[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [propsLoading, setPropsLoading]     = useState(true);
  const [showAddProp, setShowAddProp]       = useState(false);
  const [newPropName, setNewPropName]       = useState("");

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

  // Fetch all client slugs + properties once on mount
  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => {
        const all: Record<string, string[]> = data.properties ?? {};
        setAllProperties(all);
        const clients = Object.keys(all).sort();
        setClientNames(clients);
        const first = clients[0] ?? "";
        setClientName(first);
        const initial = all[first] ?? [];
        setProperties(initial);
        setSelectedProperty(initial[0] ?? "");
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

  const handleAddProperty = () => {
    const name = newPropName.trim();
    if (!name || properties.includes(name)) return;
    const updated = [...properties, name].sort();
    setProperties(updated);
    setSelectedProperty(name);
    setNewPropName("");
    setShowAddProp(false);
  };

  const fileKey = headers.find((h) => h.toLowerCase().includes("file")) ?? headers[0] ?? "";

  const handleClientChange = (name: string) => {
    setClientName(name);
  };

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const handleSubmit = async () => {
    if (!clientName) return;
    setStep("running");
    setErrMsg(null);
    timersRef.current.push(setTimeout(() => {}, 1000));

    try {
      const res = await fetch("/api/automate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          property: selectedProperty,
          openingHook: hook,
          cta,
          competitorStructure: rows.find((r) => r[fileKey] === selectedFile) ?? null,
        }),
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
            {clientNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Property Tag */}
        <div>
          <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
            Property
          </label>
          <div className="flex items-center gap-2 relative">
            {propsLoading ? (
              <div className="flex-1 h-11 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
            ) : (
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                disabled={running || properties.length === 0}
                className="flex-1 rounded-[10px] px-4 py-3 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                style={{
                  background: "var(--bg)",
                  border: `1px solid ${ACTIVE_COLOR}`,
                  color: "var(--text)",
                  boxShadow: `0 0 12px ${ACTIVE_GLOW}`,
                }}
              >
                {properties.length === 0
                  ? <option value="">No properties yet</option>
                  : properties.map((p) => <option key={p} value={p}>{p}</option>)
                }
              </select>
            )}

            {/* Add property button */}
            <button
              onClick={() => setShowAddProp((v) => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] font-bold transition-all cursor-pointer flex-shrink-0"
              style={{
                background: "var(--surface2)",
                border: `1px solid ${ACTIVE_COLOR}`,
                color: ACTIVE_COLOR,
                boxShadow: `0 0 8px ${ACTIVE_GLOW}`,
              }}
              title="Add property tag"
            >
              +
            </button>

            {/* Add property popup */}
            <AnimatePresence>
              {showAddProp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-12 z-50 rounded-2xl p-4 flex flex-col gap-3 shadow-xl"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${ACTIVE_COLOR}`,
                    boxShadow: `0 0 24px ${ACTIVE_GLOW}`,
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
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = ACTIVE_COLOR)}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddProperty}
                      disabled={!newPropName.trim()}
                      className="flex-1 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer disabled:opacity-40"
                      style={{ background: ACTIVE_COLOR, color: "#fff", border: "none" }}
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
                  <option key={i} value={row[fileKey]}>{row[fileKey]}</option>
                ))}
              </select>
              {selectedFile && (
                <button
                  onClick={() => {
                    const row = rows.find((r) => r[fileKey] === selectedFile);
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
              disabled={!running && !clientName}
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
                  <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{selected[fileKey]}</p>
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

