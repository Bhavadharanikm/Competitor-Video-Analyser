"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ACTIVE_COLOR = "#F59E0B";
const ACTIVE_GLOW  = "rgba(245,158,11,0.25)";
const CARD_BORDER  = "rgba(245,158,11,0.3)";

type Mode = "one_template" | "multiple_templates";
type Step = "idle" | "running" | "done" | "error";

interface SheetRow { [key: string]: string; }

interface ClientEntry {
  property:    string;
  openingHook: string;
  cta:         string;
}

export default function VideoAutomation() {
  // Sheet (competitor structures / templates)
  const [rows, setRows]           = useState<SheetRow[]>([]);
  const [headers, setHeaders]     = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Supabase: client slugs + properties
  const [allProperties, setAllProperties] = useState<Record<string, string[]>>({});
  const [clientNames, setClientNames]     = useState<string[]>([]);
  const [propsLoading, setPropsLoading]   = useState(true);

  // Mode
  const [mode, setMode] = useState<Mode>("one_template");

  // ── One Template mode ──────────────────────────────────────────────
  const [otTemplate, setOtTemplate]         = useState<string>("");
  const [selectedClients, setSelectedClients] = useState<Record<string, ClientEntry>>({});

  // ── Multiple Templates mode ────────────────────────────────────────
  const [mtClient, setMtClient]               = useState<string>("");
  const [mtProperty, setMtProperty]           = useState<string>("");
  const [mtProperties, setMtProperties]       = useState<string[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [mtHook, setMtHook]                   = useState("");
  const [mtCta, setMtCta]                     = useState("");

  // Detail modal
  const [detailRow, setDetailRow] = useState<SheetRow | null>(null);

  // Submit
  const [step, setStep]   = useState<Step>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const fileKey = headers.find(h => h.toLowerCase().includes("file")) ?? headers[0] ?? "";
  const running = step === "running";

  // Fetch sheet data
  useEffect(() => {
    fetch("/api/sheet")
      .then(r => r.json())
      .then(data => {
        if (data.error) { setFetchError(data.error); }
        else {
          setHeaders(data.headers ?? []);
          setRows(data.rows ?? []);
          const fk = (data.headers as string[])?.find(h => h.toLowerCase().includes("file")) ?? data.headers?.[0] ?? "";
          if (data.rows?.length) setOtTemplate(data.rows[0][fk] ?? "");
        }
        setLoading(false);
      })
      .catch(() => { setFetchError("Could not load sheet."); setLoading(false); });
  }, []);

  // Fetch all properties + derive client list
  useEffect(() => {
    fetch("/api/properties")
      .then(r => r.json())
      .then(data => {
        const all: Record<string, string[]> = data.properties ?? {};
        setAllProperties(all);
        const clients = Object.keys(all).sort();
        setClientNames(clients);
        if (clients[0]) {
          setMtClient(clients[0]);
          const props = all[clients[0]] ?? [];
          setMtProperties(props);
          setMtProperty(props[0] ?? "");
        }
        setPropsLoading(false);
      })
      .catch(() => setPropsLoading(false));
  }, []);

  // Update MT properties when client changes
  useEffect(() => {
    const props = allProperties[mtClient] ?? [];
    setMtProperties(props);
    setMtProperty(props[0] ?? "");
  }, [mtClient, allProperties]);

  // ── Client checkbox helpers ────────────────────────────────────────
  const toggleClient = (name: string) => {
    setSelectedClients(prev => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return { ...prev, [name]: { property: allProperties[name]?.[0] ?? "", openingHook: "", cta: "" } };
    });
  };

  const updateEntry = (name: string, field: keyof ClientEntry, value: string) => {
    setSelectedClients(prev => ({ ...prev, [name]: { ...prev[name], [field]: value } }));
  };

  // ── Template checkbox helpers ──────────────────────────────────────
  const toggleTemplate = (key: string) => {
    setSelectedTemplates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const handleSubmit = async () => {
    setStep("running");
    setErrMsg(null);

    const payload =
      mode === "one_template"
        ? {
            mode: "one_template",
            template: rows.find(r => r[fileKey] === otTemplate) ?? null,
            clients: Object.entries(selectedClients).map(([clientName, entry]) => ({
              clientName, ...entry,
            })),
          }
        : {
            mode: "multiple_templates",
            clientName: mtClient,
            property: mtProperty,
            templates: rows.filter(r => selectedTemplates[r[fileKey]]),
            openingHook: mtHook,
            cta: mtCta,
          };

    try {
      const res = await fetch("/api/automate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const handleReset = () => {
    clearTimers();
    setStep("idle");
    setErrMsg(null);
    setMtHook("");
    setMtCta("");
  };

  // ── Shared field style helpers ────────────────────────────────────
  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit" } as const;
  const focusBorder = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = ACTIVE_COLOR);
  const blurBorder  = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = "var(--border)");

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
      <div className="px-7 py-8 flex flex-col gap-6">

        {/* Mode selector */}
        <div>
          <label className="block text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>
            Automation Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "one_template"       as const, label: "One Template",        sub: "Run across multiple clients" },
              { key: "multiple_templates" as const, label: "Multiple Templates",  sub: "Run for one client"          },
            ]).map(({ key, label, sub }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className="rounded-2xl px-4 py-4 text-left cursor-pointer transition-all"
                style={{
                  background:  mode === key ? "rgba(245,158,11,0.08)" : "var(--bg)",
                  border:      `1.5px solid ${mode === key ? ACTIVE_COLOR : "var(--border)"}`,
                  boxShadow:   mode === key ? `0 0 16px ${ACTIVE_GLOW}` : "none",
                }}
              >
                <p className="text-[13px] font-bold mb-0.5" style={{ color: mode === key ? ACTIVE_COLOR : "var(--text)" }}>{label}</p>
                <p className="text-[11px]" style={{ color: "var(--muted)" }}>{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Mode content ── */}
        <AnimatePresence mode="wait">

          {/* ONE TEMPLATE */}
          {mode === "one_template" && (
            <motion.div
              key="one_template"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              {/* Template dropdown */}
              <div>
                <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
                  Competitor Structure (Template)
                </label>
                {loading ? (
                  <div className="h-11 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
                ) : fetchError ? (
                  <p className="text-[12px]" style={{ color: "#EF4444" }}>{fetchError}</p>
                ) : (
                  <>
                    <select
                      value={otTemplate}
                      onChange={e => setOtTemplate(e.target.value)}
                      disabled={running}
                      className="w-full rounded-[10px] px-4 py-3 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                      style={{ background: "var(--bg)", border: `1px solid ${ACTIVE_COLOR}`, color: "var(--text)", boxShadow: `0 0 12px ${ACTIVE_GLOW}` }}
                    >
                      {rows.map((row, i) => <option key={i} value={row[fileKey]}>{row[fileKey]}</option>)}
                    </select>
                    {otTemplate && (
                      <button
                        onClick={() => { const r = rows.find(row => row[fileKey] === otTemplate); if (r) setDetailRow(r); }}
                        className="mt-2 text-[11px] font-semibold"
                        style={{ color: ACTIVE_COLOR }}
                      >
                        View details →
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Client checkboxes */}
              <div>
                <label className="block text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>
                  Select Clients
                </label>
                {propsLoading ? (
                  <div className="h-20 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
                ) : (
                  <div className="flex flex-col gap-3">
                    {clientNames.map(name => {
                      const checked = !!selectedClients[name];
                      const entry   = selectedClients[name];
                      return (
                        <div
                          key={name}
                          className="rounded-2xl overflow-hidden transition-all"
                          style={{ border: `1px solid ${checked ? ACTIVE_COLOR : "var(--border)"}`, boxShadow: checked ? `0 0 12px ${ACTIVE_GLOW}` : "none" }}
                        >
                          {/* Checkbox row */}
                          <div
                            className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                            style={{ background: checked ? "rgba(245,158,11,0.05)" : "var(--bg)" }}
                            onClick={() => toggleClient(name)}
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ background: checked ? ACTIVE_COLOR : "transparent", border: `1.5px solid ${checked ? ACTIVE_COLOR : "var(--border)"}` }}
                            >
                              {checked && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
                            </div>
                            <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{name}</span>
                          </div>

                          {/* Expanded fields per client */}
                          <AnimatePresence>
                            {checked && entry && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="flex flex-col gap-3 px-4 py-4" style={{ borderTop: "1px solid var(--border)" }}>
                                  {/* Property */}
                                  <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Property</p>
                                    <select
                                      value={entry.property}
                                      onChange={e => updateEntry(name, "property", e.target.value)}
                                      className="w-full rounded-[8px] px-3 py-2 text-[12px] outline-none cursor-pointer"
                                      style={inputStyle}
                                      onFocus={focusBorder}
                                      onBlur={blurBorder}
                                    >
                                      {(allProperties[name] ?? []).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </div>
                                  {/* Hook */}
                                  <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>
                                      Opening Hook <span style={{ color: "var(--border)", fontWeight: 400 }}>(optional)</span>
                                    </p>
                                    <textarea
                                      value={entry.openingHook}
                                      onChange={e => updateEntry(name, "openingHook", e.target.value)}
                                      placeholder="What grabs attention in the first 3 seconds…"
                                      rows={2}
                                      className="w-full rounded-[8px] px-3 py-2 text-[12px] outline-none resize-none"
                                      style={inputStyle}
                                      onFocus={focusBorder}
                                      onBlur={blurBorder}
                                    />
                                  </div>
                                  {/* CTA */}
                                  <div>
                                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>
                                      CTA <span style={{ color: "var(--border)", fontWeight: 400 }}>(optional)</span>
                                    </p>
                                    <input
                                      type="text"
                                      value={entry.cta}
                                      onChange={e => updateEntry(name, "cta", e.target.value)}
                                      placeholder="What should viewers do next…"
                                      className="w-full rounded-[8px] px-3 py-2 text-[12px] outline-none"
                                      style={inputStyle}
                                      onFocus={focusBorder}
                                      onBlur={blurBorder}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* MULTIPLE TEMPLATES */}
          {mode === "multiple_templates" && (
            <motion.div
              key="multiple_templates"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              {/* Client */}
              <div>
                <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Client</label>
                <select
                  value={mtClient}
                  onChange={e => setMtClient(e.target.value)}
                  disabled={running || propsLoading}
                  className="w-full rounded-[10px] px-4 py-3 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--bg)", border: `1px solid ${ACTIVE_COLOR}`, color: "var(--text)", boxShadow: `0 0 12px ${ACTIVE_GLOW}` }}
                >
                  {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Property */}
              <div>
                <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Property</label>
                <select
                  value={mtProperty}
                  onChange={e => setMtProperty(e.target.value)}
                  disabled={running || mtProperties.length === 0}
                  className="w-full rounded-[10px] px-4 py-3 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--bg)", border: `1px solid ${ACTIVE_COLOR}`, color: "var(--text)", boxShadow: `0 0 12px ${ACTIVE_GLOW}` }}
                >
                  {mtProperties.length === 0
                    ? <option value="">No properties yet</option>
                    : mtProperties.map(p => <option key={p} value={p}>{p}</option>)
                  }
                </select>
              </div>

              {/* Template checkboxes */}
              <div>
                <label className="block text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--muted)" }}>
                  Competitor Structures (Templates)
                </label>
                {loading ? (
                  <div className="h-20 rounded-[10px] animate-pulse" style={{ background: "var(--surface2)" }} />
                ) : (
                  <div className="flex flex-col gap-2">
                    {rows.map((row, i) => {
                      const key     = row[fileKey];
                      const checked = !!selectedTemplates[key];
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-[10px] px-4 py-3 cursor-pointer select-none transition-all"
                          style={{ background: checked ? "rgba(245,158,11,0.05)" : "var(--bg)", border: `1px solid ${checked ? ACTIVE_COLOR : "var(--border)"}` }}
                          onClick={() => toggleTemplate(key)}
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                            style={{ background: checked ? ACTIVE_COLOR : "transparent", border: `1.5px solid ${checked ? ACTIVE_COLOR : "var(--border)"}` }}
                          >
                            {checked && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
                          </div>
                          <span className="text-[12px]" style={{ color: "var(--text)" }}>{key}</span>
                          <button
                            onClick={e => { e.stopPropagation(); const r = rows.find(row => row[fileKey] === key); if (r) setDetailRow(r); }}
                            className="ml-auto text-[10px] font-semibold cursor-pointer"
                            style={{ color: "var(--muted)" }}
                          >
                            details →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Shared Opening Hook */}
              <div>
                <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
                  Opening Hook <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={mtHook}
                  onChange={e => setMtHook(e.target.value)}
                  placeholder="What grabs attention in the first 3 seconds…"
                  rows={3}
                  disabled={running}
                  className="w-full rounded-[10px] px-4 py-3 text-[13px] outline-none resize-none disabled:opacity-50"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>

              {/* Shared CTA */}
              <div>
                <label className="block text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>
                  CTA <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={mtCta}
                  onChange={e => setMtCta(e.target.value)}
                  placeholder="What should viewers do next…"
                  disabled={running}
                  className="w-full rounded-[10px] px-4 py-3 text-[13px] outline-none disabled:opacity-50"
                  style={inputStyle}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {errMsg && <p className="text-[12px]" style={{ color: "#EF4444" }}>{errMsg}</p>}

        {/* Submit */}
        <div className="flex justify-end">
          {step === "done" ? (
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}
            >
              New
            </button>
          ) : (
            <button
              onClick={running ? handleReset : handleSubmit}
              className="px-6 py-3 rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all"
              style={running
                ? { border: "1px solid var(--border)", color: "var(--muted)", background: "none" }
                : { background: ACTIVE_COLOR, color: "#fff", boxShadow: `0 0 20px ${ACTIVE_GLOW}`, border: "none" }
              }
            >
              {running ? "Cancel" : "Run Automation →"}
            </button>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detailRow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
            onClick={() => setDetailRow(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden"
              style={{ background: "var(--surface)", border: `1px solid ${CARD_BORDER}`, maxHeight: "80vh", overflowY: "auto" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-7 py-5 sticky top-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--muted)" }}>Template Details</p>
                  <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{detailRow[fileKey]}</p>
                </div>
                <button
                  onClick={() => setDetailRow(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] cursor-pointer"
                  style={{ background: "var(--surface2)", color: "var(--muted)" }}
                >✕</button>
              </div>
              <div className="px-7 py-6 flex flex-col gap-4">
                {headers.map(h => detailRow[h] ? (
                  <div key={h}>
                    <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)", fontFamily: "JetBrains Mono, monospace" }}>{h}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>{detailRow[h]}</p>
                  </div>
                ) : null)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
