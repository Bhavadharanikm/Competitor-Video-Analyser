"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";

const ACTIVE_COLOR = "#2563EB";
const ACTIVE_GLOW  = "rgba(37,99,235,0.25)";
const CARD_BORDER  = "rgba(37,99,235,0.3)";

type Mode = null | "one_template" | "multiple_templates";
type Step = "idle" | "running" | "done" | "error";

interface SheetRow { [key: string]: string; }

interface ClientEntry {
  property:    string;
  openingHook: string;
  cta:         string;
}

interface ReelJob {
  id:           string;
  client_slug:  string;
  property_tag: string;
  file_name:    string | null;
  status:       string;
  message:      string;
  video_url:    string | null;
  updated_at:   string;
}

const PIPELINE_STEPS = [
  "Selecting your best clips...",
  "Trimming and preparing your clips...",
  "Stitching your reel together...",
  "Adding background music...",
  "Adding your captions and branding...",
  "Your reel is ready! 🎉",
];

function messageToStepIdx(msg: string | null | undefined): number {
  if (!msg) return 0;
  const m = msg.toLowerCase();
  if (m.includes("ready") || m.includes("completed")) return 5;
  if (m.includes("caption") || m.includes("brand") || m.includes("overlay")) return 4;
  if (m.includes("music")) return 3;
  if (m.includes("stitch") || m.includes("compos") || m.includes("merg")) return 2;
  if (m.includes("trim")) return 1;
  if (m.includes("select") || m.includes("clip")) return 0;
  return 0;
}

function normalizeSlug(slug: string) {
  return slug.replace(/^=/, "").trim();
}

function initials(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function VideoAutomation() {
  const [rows, setRows]             = useState<SheetRow[]>([]);
  const [headers, setHeaders]       = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [allProperties, setAllProperties] = useState<Record<string, string[]>>({});
  const [clientNames, setClientNames]     = useState<string[]>([]);
  const [propsLoading, setPropsLoading]   = useState(true);

  const [mode, setMode] = useState<Mode>(null);

  const [otTemplate, setOtTemplate]           = useState<string>("");
  const [selectedClients, setSelectedClients] = useState<Record<string, ClientEntry>>({});
  const [clientSearch, setClientSearch]       = useState("");
  const [activeClient, setActiveClient]       = useState<string | null>(null);

  const [mtClient, setMtClient]                   = useState<string>("");
  const [mtProperty, setMtProperty]               = useState<string>("");
  const [mtProperties, setMtProperties]           = useState<string[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({});
  const [mtHook, setMtHook]                       = useState("");
  const [mtCta, setMtCta]                         = useState("");

  const [detailRow, setDetailRow] = useState<SheetRow | null>(null);
  const [step, setStep]       = useState<Step>("idle");
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const [runId, setRunId]     = useState<string | null>(null);
  const [jobStatuses, setJobStatuses] = useState<ReelJob[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileKey = headers.find(h => h.toLowerCase().includes("file")) ?? headers[0] ?? "";
  const running = step === "running";
  const selectedClientNames  = Object.keys(selectedClients);
  const selectedTemplateNames = Object.keys(selectedTemplates).filter(k => selectedTemplates[k]);
  const videosToGenerate     = mode === "multiple_templates" ? selectedTemplateNames.length : selectedClientNames.length;

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

  useEffect(() => {
    const props = allProperties[mtClient] ?? [];
    setMtProperties(props);
    setMtProperty(props[0] ?? "");
  }, [mtClient, allProperties]);

  const toggleClient = (name: string) => {
    setSelectedClients(prev => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        if (activeClient === name) setActiveClient(null);
        return next;
      }
      return { ...prev, [name]: { property: allProperties[name]?.[0] ?? "", openingHook: "", cta: "" } };
    });
  };

  const updateEntry = (name: string, field: keyof ClientEntry, value: string) => {
    setSelectedClients(prev => ({ ...prev, [name]: { ...prev[name], [field]: value } }));
  };

  const selectAll = () => {
    const next: Record<string, ClientEntry> = {};
    clientNames.forEach(n => {
      next[n] = selectedClients[n] ?? { property: allProperties[n]?.[0] ?? "", openingHook: "", cta: "" };
    });
    setSelectedClients(next);
  };

  const clearAll = () => { setSelectedClients({}); setActiveClient(null); };

  const toggleTemplate = (key: string) => {
    setSelectedTemplates(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = (rid: string) => {
    stopPolling();
    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs?runId=${rid}`);
        if (!res.ok) return;
        const data = await res.json();
        const jobs: ReelJob[] = data.jobs ?? [];
        setJobStatuses(jobs);
        if (jobs.length > 0 && jobs.every(j => j.status === "completed" || j.status === "failed")) {
          stopPolling();
          setStep("done");
        }
      } catch (_e) { /* ignore transient errors */ }
    };
    tick(); // immediate first check
    pollRef.current = setInterval(tick, 3000);
  };

  const handleSubmit = async () => {
    const newRunId = crypto.randomUUID();
    setRunId(newRunId);
    setJobStatuses([]);
    setStep("running");
    setErrMsg(null);
    const payload =
      mode === "one_template"
        ? {
            run_id: newRunId,
            mode: "one_template",
            template: rows.find(r => r[fileKey] === otTemplate) ?? null,
            clients: Object.entries(selectedClients).map(([clientName, entry]) => ({ clientName, ...entry })),
          }
        : {
            run_id: newRunId,
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
      startPolling(newRunId);
    } catch (err: unknown) {
      clearTimers();
      stopPolling();
      setStep("error");
      setErrMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  const handleReset = () => {
    clearTimers();
    stopPolling();
    setStep("idle");
    setErrMsg(null);
    setRunId(null);
    setJobStatuses([]);
    setMtHook("");
    setMtCta("");
  };

  const handleClose = () => {
    handleReset();
    setMode(null);
  };

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "inherit" } as const;
  const focusBorder = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = ACTIVE_COLOR);
  const blurBorder  = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = "var(--border)");

  const filteredClients = clientNames.filter(n => n.toLowerCase().includes(clientSearch.toLowerCase()));

  // ── Page variants ─────────────────────────────────────────────────
  const pageIn  = { opacity: 0, y: 18 };
  const pageOut = { opacity: 0, y: -10 };
  const pageDur: Transition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] };

  return (
    <div className="mb-8">
      <AnimatePresence mode="wait">

        {/* ── SELECTION SCREEN ── */}
        {mode === null && (
          <motion.div
            key="select"
            initial={pageIn}
            animate={{ opacity: 1, y: 0 }}
            exit={pageOut}
            transition={pageDur}
            className="flex flex-col gap-3"
          >
            {/* One Template card */}
            <motion.button
              onClick={() => setMode("one_template")}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-between rounded-2xl px-6 py-5 cursor-pointer text-left"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = ACTIVE_COLOR; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${ACTIVE_GLOW}`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                  <span style={{ fontSize: 20 }}>⚡</span>
                </div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>One Template</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>Run one template across multiple clients</p>
                </div>
              </div>
              <span className="text-[18px]" style={{ color: "var(--muted)" }}>→</span>
            </motion.button>

            {/* Multiple Templates card */}
            <motion.button
              onClick={() => setMode("multiple_templates")}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full flex items-center justify-between rounded-2xl px-6 py-5 cursor-pointer text-left"
              style={{ background: "var(--surface)", border: "1.5px solid var(--border)", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = ACTIVE_COLOR; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${ACTIVE_GLOW}`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                  <span style={{ fontSize: 20 }}>🎬</span>
                </div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>Multiple Templates</p>
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>Run many templates for one client</p>
                </div>
              </div>
              <span className="text-[18px]" style={{ color: "var(--muted)" }}>→</span>
            </motion.button>
          </motion.div>
        )}

        {/* ── ONE TEMPLATE FULL VIEW ── */}
        {mode === "one_template" && (
          <motion.div
            key="one_template"
            initial={pageIn}
            animate={{ opacity: 1, y: 0 }}
            exit={pageOut}
            transition={pageDur}
          >
            {/* Back button */}
            <button onClick={handleClose} className="flex items-center gap-2 mb-5 text-[13px] font-semibold cursor-pointer" style={{ color: "var(--muted)", background: "none", border: "none", padding: 0 }}>
              <span style={{ fontSize: 16 }}>←</span> Back
            </button>

            {/* ── JOB TRACKER (shows when running or done) ── */}
            <AnimatePresence mode="wait">
            {(step === "running" || step === "done") && (
              <motion.div
                key="tracker"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col gap-4"
              >
                {/* Tracker header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[18px] font-bold" style={{ color: "var(--text)" }}>
                      {step === "done" ? "Automation complete ✓" : "Running automation…"}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                      {step === "done"
                        ? `${jobStatuses.filter(j => j.status === "completed").length} of ${selectedClientNames.length} reels ready`
                        : `Processing ${selectedClientNames.length} client${selectedClientNames.length !== 1 ? "s" : ""}  ·  ${otTemplate}`}
                    </p>
                    {runId && (
                      <p className="text-[10px] mt-1.5 font-mono" style={{ color: "var(--muted)", opacity: 0.55 }}>
                        run id · {runId}
                      </p>
                    )}
                  </div>
                  {step === "done" && (
                    <button onClick={handleReset} className="px-4 py-2 rounded-[10px] text-[12px] font-semibold cursor-pointer" style={{ border: `1px solid ${ACTIVE_COLOR}`, color: ACTIVE_COLOR, background: "none" }}>
                      New run →
                    </button>
                  )}
                </div>

                {/* Per-client job cards */}
                <div className="flex flex-col gap-3">
                  {selectedClientNames.map((clientName) => {
                    const job = jobStatuses.find(j => normalizeSlug(j.client_slug) === clientName);
                    const isDone   = job?.status === "completed";
                    const isFailed = job?.status === "failed";
                    const currentMsg = job?.message ?? "Queued";
                    const currentStepIdx = isDone ? PIPELINE_STEPS.length : messageToStepIdx(job?.message);
                    const isActive = !isDone && !isFailed;

                    return (
                      <motion.div
                        key={clientName}
                        layout
                        className="rounded-2xl overflow-hidden"
                        style={{ border: `1.5px solid ${isDone ? "rgba(34,197,94,0.4)" : isFailed ? "rgba(239,68,68,0.4)" : CARD_BORDER}`, background: "var(--surface)" }}
                      >
                        {/* Card header */}
                        <div className="flex items-center gap-3 px-5 py-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 relative" style={{ background: isDone ? "rgba(34,197,94,0.12)" : isFailed ? "rgba(239,68,68,0.1)" : "rgba(37,99,235,0.1)", color: isDone ? "#22C55E" : isFailed ? "#EF4444" : ACTIVE_COLOR, border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : isFailed ? "rgba(239,68,68,0.2)" : "rgba(37,99,235,0.2)"}` }}>
                            {isDone ? "✓" : isFailed ? "✕" : initials(clientName)}
                            {isActive && (
                              <span className="absolute inset-0 rounded-xl animate-ping" style={{ background: "rgba(37,99,235,0.15)", animationDuration: "1.5s" }} />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{clientName}</p>
                            <p className="text-[11px]" style={{ color: isDone ? "#22C55E" : isFailed ? "#EF4444" : "var(--muted)" }}>
                              {isFailed ? "Something went wrong — our team's been notified." : currentMsg}
                            </p>
                          </div>
                          {isDone && job?.video_url && (
                            <a href={job.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}>
                              Watch →
                            </a>
                          )}
                        </div>

                        {/* Step progress (only for in-progress jobs) */}
                        {isActive && (
                          <div className="px-5 pb-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                            {PIPELINE_STEPS.map((label, i) => {
                              const isStepDone    = i < currentStepIdx;
                              const isStepCurrent = i === currentStepIdx;
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{ background: isStepDone ? ACTIVE_COLOR : isStepCurrent ? "transparent" : "var(--bg)", border: isStepDone ? "none" : isStepCurrent ? `2px solid ${ACTIVE_COLOR}` : "2px solid var(--border)" }}>
                                    {isStepDone && <span className="text-[9px] text-white font-bold">✓</span>}
                                    {isStepCurrent && (
                                      <>
                                        <span className="absolute inset-0 rounded-full animate-spin" style={{ border: `2px solid transparent`, borderTopColor: ACTIVE_COLOR }} />
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACTIVE_COLOR }} />
                                      </>
                                    )}
                                  </div>
                                  <span className="text-[12px]" style={{ color: isStepDone ? "var(--muted)" : isStepCurrent ? "var(--text)" : "var(--border)", fontWeight: isStepCurrent ? 600 : 400 }}>
                                    {label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* ── FORM (hidden while running/done) ── */}
            {step === "idle" && (
            <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 420px" }}>

              {/* LEFT */}
              <div className="flex flex-col gap-4 rounded-2xl p-6" style={{ background: "var(--surface)", border: `1.5px solid ${CARD_BORDER}`, boxShadow: `0 0 24px ${ACTIVE_GLOW}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                    <span style={{ color: ACTIVE_COLOR, fontSize: 16 }}>⚡</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>One Template</p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>One template, many clients.</p>
                  </div>
                </div>

                {/* Template */}
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Competitor structure (template)</p>
                  {loading ? (
                    <div className="h-10 rounded-[8px] animate-pulse" style={{ background: "var(--surface)" }} />
                  ) : fetchError ? (
                    <p className="text-[12px]" style={{ color: "#EF4444" }}>{fetchError}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={otTemplate}
                        onChange={e => setOtTemplate(e.target.value)}
                        disabled={running}
                        className="flex-1 rounded-[8px] px-3 py-2.5 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                      >
                        {rows.map((row, i) => <option key={i} value={row[fileKey]}>{row[fileKey]}</option>)}
                      </select>
                      {otTemplate && (
                        <button onClick={() => { const r = rows.find(row => row[fileKey] === otTemplate); if (r) setDetailRow(r); }} className="text-[11px] font-semibold whitespace-nowrap" style={{ color: ACTIVE_COLOR }}>
                          details →
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Clients */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
                      Select clients{selectedClientNames.length > 0 ? ` · ${selectedClientNames.length} chosen` : ""}
                    </p>
                    {clientNames.length > 0 && <button onClick={selectAll} className="text-[11px] font-semibold" style={{ color: ACTIVE_COLOR }}>Select all</button>}
                  </div>
                  <div className="flex items-center gap-2 rounded-[8px] px-3 py-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: "var(--muted)", flexShrink: 0 }}>
                      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input type="text" value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Search clients" className="flex-1 text-[12px] outline-none bg-transparent" style={{ color: "var(--text)" }} />
                    {clientSearch && <button onClick={() => setClientSearch("")} className="text-[11px]" style={{ color: "var(--muted)" }}>✕</button>}
                  </div>
                  {propsLoading ? (
                    <div className="h-24 rounded-[8px] animate-pulse" style={{ background: "var(--surface)" }} />
                  ) : (
                    <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 280 }}>
                      {filteredClients.length === 0 && <p className="text-[12px] py-3 text-center" style={{ color: "var(--muted)" }}>No clients match</p>}
                      {filteredClients.map(name => {
                        const checked = !!selectedClients[name];
                        const isActive = activeClient === name;
                        return (
                          <div
                            key={name}
                            className="flex items-center gap-3 px-2 py-2.5 cursor-pointer select-none rounded-[8px] transition-colors"
                            style={{ background: isActive ? "rgba(37,99,235,0.08)" : checked ? "rgba(37,99,235,0.03)" : "transparent" }}
                            onClick={() => {
                              if (!checked) {
                                setSelectedClients(prev => ({ ...prev, [name]: { property: allProperties[name]?.[0] ?? "", openingHook: "", cta: "" } }));
                              }
                              setActiveClient(name);
                            }}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: isActive ? "rgba(37,99,235,0.18)" : checked ? "rgba(37,99,235,0.12)" : "var(--surface)", color: checked || isActive ? ACTIVE_COLOR : "var(--muted)", border: `1px solid ${checked || isActive ? "rgba(37,99,235,0.3)" : "var(--border)"}` }}>
                              {initials(name)}
                            </div>
                            <span className="flex-1 text-[13px]" style={{ color: "var(--text)", fontWeight: checked ? 600 : 400 }}>{name}</span>
                            {(allProperties[name] ?? []).length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface)", color: "var(--muted)" }}>{(allProperties[name] ?? []).length} prop</span>}
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all" style={{ background: checked ? ACTIVE_COLOR : "transparent", border: `1.5px solid ${checked ? ACTIVE_COLOR : "var(--border)"}` }}>
                              {checked && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — configure + run summary */}
              <div className="flex flex-col gap-4 rounded-2xl p-6" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>

                {/* Stats row */}
                <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--muted)" }}>Template</p>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{otTemplate || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--muted)" }}>Videos</p>
                    <p className="text-[20px] font-bold" style={{ color: videosToGenerate > 0 ? ACTIVE_COLOR : "var(--muted)" }}>{videosToGenerate}</p>
                  </div>
                </div>

                {/* Active client config */}
                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {activeClient && selectedClients[activeClient] ? (
                      <motion.div
                        key={activeClient}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: "rgba(37,99,235,0.12)", color: ACTIVE_COLOR, border: "1px solid rgba(37,99,235,0.3)" }}>
                            {initials(activeClient)}
                          </div>
                          <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>{activeClient}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Property</p>
                          <select
                            value={selectedClients[activeClient].property}
                            onChange={e => updateEntry(activeClient, "property", e.target.value)}
                            className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer"
                            style={inputStyle}
                            onFocus={focusBorder}
                            onBlur={blurBorder}
                          >
                            {(allProperties[activeClient] ?? []).map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Opening Hook</p>
                          <textarea
                            value={selectedClients[activeClient].openingHook}
                            onChange={e => updateEntry(activeClient, "openingHook", e.target.value)}
                            placeholder="Hook…"
                            rows={3}
                            className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none resize-none"
                            style={inputStyle}
                            onFocus={focusBorder}
                            onBlur={blurBorder}
                          />
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>CTA</p>
                          <input
                            type="text"
                            value={selectedClients[activeClient].cta}
                            onChange={e => updateEntry(activeClient, "cta", e.target.value)}
                            placeholder="CTA…"
                            className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none"
                            style={inputStyle}
                            onFocus={focusBorder}
                            onBlur={blurBorder}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col items-center justify-center py-10 gap-2"
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 18 }}>👈</span>
                        </div>
                        <p className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>Click a client to configure</p>
                        <p className="text-[11px]" style={{ color: "var(--muted)", opacity: 0.6 }}>Set property, hook & CTA per client</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selected client chips */}
                {selectedClientNames.length > 0 && (
                  <div className="flex flex-col gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>Selected · {selectedClientNames.length}</span>
                      <button onClick={clearAll} className="text-[11px] font-semibold" style={{ color: ACTIVE_COLOR }}>Clear all</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedClientNames.map(name => (
                        <div
                          key={name}
                          onClick={() => setActiveClient(name)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer transition-all"
                          style={{ background: activeClient === name ? ACTIVE_COLOR : "var(--bg)", border: `1px solid ${activeClient === name ? ACTIVE_COLOR : "var(--border)"}` }}
                        >
                          <span className="text-[11px] font-medium" style={{ color: activeClient === name ? "#fff" : "var(--text)" }}>{name}</span>
                          <button
                            onClick={e => { e.stopPropagation(); toggleClient(name); }}
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] leading-none"
                            style={{ background: activeClient === name ? "rgba(255,255,255,0.25)" : "var(--border)", color: activeClient === name ? "#fff" : "var(--muted)" }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errMsg && <p className="text-[11px]" style={{ color: "#EF4444" }}>{errMsg}</p>}

                <div className="flex gap-2">
                  <button onClick={handleSubmit} disabled={videosToGenerate === 0} className="w-full py-3 rounded-[10px] text-[12px] font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: ACTIVE_COLOR, color: "#fff", boxShadow: `0 0 16px ${ACTIVE_GLOW}`, border: "none" }}>
                    Run automation →
                  </button>
                </div>
              </div>

            </div>
            )} {/* end step === "idle" */}
          </motion.div>
        )}

        {/* ── MULTIPLE TEMPLATES FULL VIEW ── */}
        {mode === "multiple_templates" && (
          <motion.div
            key="multiple_templates"
            initial={pageIn}
            animate={{ opacity: 1, y: 0 }}
            exit={pageOut}
            transition={pageDur}
          >
            {/* Back button */}
            <button onClick={handleClose} className="flex items-center gap-2 mb-5 text-[13px] font-semibold cursor-pointer" style={{ color: "var(--muted)", background: "none", border: "none", padding: 0 }}>
              <span style={{ fontSize: 16 }}>←</span> Back
            </button>

            {/* ── JOB TRACKER (shows when running or done) ── */}
            <AnimatePresence mode="wait">
            {(step === "running" || step === "done") && (
              <motion.div
                key="mt-tracker"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col gap-4 mb-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[18px] font-bold" style={{ color: "var(--text)" }}>
                      {step === "done" ? "Automation complete ✓" : "Running automation…"}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                      {step === "done"
                        ? `${jobStatuses.filter(j => j.status === "completed").length} of ${selectedTemplateNames.length} reels ready`
                        : `Processing ${selectedTemplateNames.length} template${selectedTemplateNames.length !== 1 ? "s" : ""}  ·  ${mtClient}`}
                    </p>
                    {runId && (
                      <p className="text-[10px] mt-1.5 font-mono" style={{ color: "var(--muted)", opacity: 0.55 }}>
                        run id · {runId}
                      </p>
                    )}
                  </div>
                  {step === "done" && (
                    <button onClick={handleReset} className="px-4 py-2 rounded-[10px] text-[12px] font-semibold cursor-pointer" style={{ border: `1px solid ${ACTIVE_COLOR}`, color: ACTIVE_COLOR, background: "none" }}>
                      New run →
                    </button>
                  )}
                  {step === "running" && (
                    <button onClick={handleReset} className="px-4 py-2 rounded-[10px] text-[12px] font-semibold cursor-pointer" style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "none" }}>
                      Cancel
                    </button>
                  )}
                </div>

                {/* Per-template job cards — show queued placeholders immediately, fill with real data as Supabase responds */}
                <div className="flex flex-col gap-3">
                  {selectedTemplateNames.map((templateName, idx) => {
                    // MT jobs all share the same client_slug — match by arrival order
                    const job = jobStatuses[idx] ?? null;
                    const isDone   = job?.status === "completed";
                    const isFailed = job?.status === "failed";
                    const currentMsg = job?.message ?? "Queued…";
                    // Use file_name from Supabase as label when available (e.g. "Awayframes_Wholesome_8Jul2026")
                    const label = job?.file_name ?? templateName;
                    const currentStepIdx = isDone ? PIPELINE_STEPS.length : messageToStepIdx(job?.message);
                    const isActive = !!job && !isDone && !isFailed;
                    const isQueued = !job;
                    return (
                      <motion.div key={templateName} layout className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${isDone ? "rgba(34,197,94,0.4)" : isFailed ? "rgba(239,68,68,0.4)" : CARD_BORDER}`, background: "var(--surface)" }}>
                        <div className="flex items-center gap-3 px-5 py-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 relative" style={{ background: isDone ? "rgba(34,197,94,0.12)" : isFailed ? "rgba(239,68,68,0.1)" : "rgba(37,99,235,0.1)", color: isDone ? "#22C55E" : isFailed ? "#EF4444" : ACTIVE_COLOR, border: `1px solid ${isDone ? "rgba(34,197,94,0.3)" : isFailed ? "rgba(239,68,68,0.2)" : "rgba(37,99,235,0.2)"}` }}>
                            {isDone ? "✓" : isFailed ? "✕" : label.slice(0,2).toUpperCase()}
                            {(isActive || isQueued) && <span className="absolute inset-0 rounded-xl animate-ping" style={{ background: "rgba(37,99,235,0.15)", animationDuration: isQueued ? "2s" : "1.5s" }} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{label}</p>
                            {job?.file_name && label !== templateName && (
                              <p className="text-[10px] truncate" style={{ color: "var(--muted)", opacity: 0.6 }}>{templateName}</p>
                            )}
                            <p className="text-[11px]" style={{ color: isDone ? "#22C55E" : isFailed ? "#EF4444" : "var(--muted)" }}>
                              {isFailed ? "Something went wrong — our team's been notified." : currentMsg}
                            </p>
                          </div>
                          {isDone && job?.video_url && (
                            <a href={job.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}>Watch →</a>
                          )}
                        </div>
                        {isActive && (
                          <div className="px-5 pb-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                            {PIPELINE_STEPS.map((label, i) => {
                              const isStepDone    = i < currentStepIdx;
                              const isStepCurrent = i === currentStepIdx;
                              return (
                                <div key={i} className="flex items-center gap-3">
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 relative" style={{ background: isStepDone ? ACTIVE_COLOR : isStepCurrent ? "transparent" : "var(--bg)", border: isStepDone ? "none" : isStepCurrent ? `2px solid ${ACTIVE_COLOR}` : "2px solid var(--border)" }}>
                                    {isStepDone && <span className="text-[9px] text-white font-bold">✓</span>}
                                    {isStepCurrent && (
                                      <>
                                        <span className="absolute inset-0 rounded-full animate-spin" style={{ border: `2px solid transparent`, borderTopColor: ACTIVE_COLOR }} />
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACTIVE_COLOR }} />
                                      </>
                                    )}
                                  </div>
                                  <span className="text-[12px]" style={{ color: isStepDone ? "var(--muted)" : isStepCurrent ? "var(--text)" : "var(--border)", fontWeight: isStepCurrent ? 600 : 400 }}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {/* ── FORM (hidden while running/done) ── */}
            {step === "idle" && (
            <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 420px" }}>

              {/* LEFT — template checklist */}
              <div className="flex flex-col gap-4 rounded-2xl p-6" style={{ background: "var(--surface)", border: `1.5px solid ${CARD_BORDER}`, boxShadow: `0 0 24px ${ACTIVE_GLOW}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)" }}>
                    <span style={{ color: ACTIVE_COLOR, fontSize: 16 }}>🎬</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>Multiple Templates</p>
                    <p className="text-[11px]" style={{ color: "var(--muted)" }}>Many templates, one client.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>
                      Templates{selectedTemplateNames.length > 0 ? ` · ${selectedTemplateNames.length} chosen` : ""}
                    </p>
                    {rows.length > 0 && (
                      <button
                        onClick={() => {
                          const allSelected = rows.every(r => selectedTemplates[r[fileKey]]);
                          if (allSelected) {
                            setSelectedTemplates({});
                          } else {
                            const all: Record<string, boolean> = {};
                            rows.forEach(r => { all[r[fileKey]] = true; });
                            setSelectedTemplates(all);
                          }
                        }}
                        className="text-[11px] font-semibold"
                        style={{ color: ACTIVE_COLOR }}
                      >
                        {rows.every(r => selectedTemplates[r[fileKey]]) ? "Clear all" : "Select all"}
                      </button>
                    )}
                  </div>
                  {loading ? (
                    <div className="h-24 rounded-[8px] animate-pulse" style={{ background: "var(--bg)" }} />
                  ) : (
                    <div className="flex flex-col overflow-y-auto" style={{ maxHeight: 320 }}>
                      {rows.map((row, i) => {
                        const tKey = row[fileKey];
                        const checked = !!selectedTemplates[tKey];
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-2 py-2.5 cursor-pointer select-none rounded-[8px] transition-colors"
                            style={{ background: checked ? "rgba(37,99,235,0.06)" : "transparent" }}
                            onClick={() => toggleTemplate(tKey)}
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: checked ? "rgba(37,99,235,0.12)" : "var(--surface)", color: checked ? ACTIVE_COLOR : "var(--muted)", border: `1px solid ${checked ? "rgba(37,99,235,0.3)" : "var(--border)"}` }}>
                              {tKey.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="flex-1 text-[13px]" style={{ color: "var(--text)", fontWeight: checked ? 600 : 400 }}>{tKey}</span>
                            <button
                              onClick={e => { e.stopPropagation(); const r = rows.find(row => row[fileKey] === tKey); if (r) setDetailRow(r); }}
                              className="text-[10px] font-semibold cursor-pointer"
                              style={{ color: "var(--muted)" }}
                            >details →</button>
                            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all" style={{ background: checked ? ACTIVE_COLOR : "transparent", border: `1.5px solid ${checked ? ACTIVE_COLOR : "var(--border)"}` }}>
                              {checked && <span className="text-[9px] text-white font-bold leading-none">✓</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — client config + run */}
              <div className="flex flex-col gap-4 rounded-2xl p-6" style={{ background: "var(--surface)", border: "1.5px solid var(--border)" }}>

                {/* Stats row */}
                <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--muted)" }}>Client</p>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{mtClient || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--muted)" }}>Videos</p>
                    <p className="text-[20px] font-bold" style={{ color: videosToGenerate > 0 ? ACTIVE_COLOR : "var(--muted)" }}>{videosToGenerate}</p>
                  </div>
                </div>

                {/* Client selector */}
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Client</p>
                  <select
                    value={mtClient}
                    onChange={e => setMtClient(e.target.value)}
                    disabled={propsLoading}
                    className="w-full rounded-[8px] px-3 py-2.5 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                    style={inputStyle}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  >
                    {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* Property selector */}
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Property</p>
                  <select
                    value={mtProperty}
                    onChange={e => setMtProperty(e.target.value)}
                    disabled={mtProperties.length === 0}
                    className="w-full rounded-[8px] px-3 py-2.5 text-[13px] font-medium outline-none cursor-pointer disabled:opacity-50"
                    style={inputStyle}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  >
                    {mtProperties.length === 0
                      ? <option value="">No properties yet</option>
                      : mtProperties.map(p => <option key={p} value={p}>{p}</option>)
                    }
                  </select>
                </div>

                {/* Opening Hook */}
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Opening Hook <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></p>
                  <textarea
                    value={mtHook}
                    onChange={e => setMtHook(e.target.value)}
                    placeholder="Hook…"
                    rows={3}
                    className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none resize-none"
                    style={inputStyle}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                {/* CTA */}
                <div>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>CTA <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></p>
                  <input
                    type="text"
                    value={mtCta}
                    onChange={e => setMtCta(e.target.value)}
                    placeholder="CTA…"
                    className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none"
                    style={inputStyle}
                    onFocus={focusBorder}
                    onBlur={blurBorder}
                  />
                </div>

                {/* Selected template chips */}
                {selectedTemplateNames.length > 0 && (
                  <div className="flex flex-col gap-2 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>Selected · {selectedTemplateNames.length}</span>
                      <button onClick={() => setSelectedTemplates({})} className="text-[11px] font-semibold" style={{ color: ACTIVE_COLOR }}>Clear all</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplateNames.map(name => (
                        <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "var(--bg)", border: `1px solid ${ACTIVE_COLOR}` }}>
                          <span className="text-[11px] font-medium" style={{ color: "var(--text)" }}>{name}</span>
                          <button
                            onClick={() => toggleTemplate(name)}
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] leading-none"
                            style={{ background: "var(--border)", color: "var(--muted)" }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errMsg && <p className="text-[11px]" style={{ color: "#EF4444" }}>{errMsg}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={videosToGenerate === 0 || !mtClient}
                    className="w-full py-3 rounded-[10px] text-[12px] font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: ACTIVE_COLOR, color: "#fff", boxShadow: `0 0 16px ${ACTIVE_GLOW}`, border: "none" }}
                  >
                    Run automation →
                  </button>
                </div>
              </div>

            </div>
            )} {/* end step === "idle" */}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {detailRow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }} onClick={() => setDetailRow(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 8 }} transition={{ type: "spring", stiffness: 380, damping: 32 }} className="w-full max-w-lg rounded-3xl overflow-hidden" style={{ background: "var(--surface)", border: `1px solid ${CARD_BORDER}`, maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-7 py-5 sticky top-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-0.5" style={{ color: "var(--muted)" }}>Template Details</p>
                  <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{detailRow[fileKey]}</p>
                </div>
                <button onClick={() => setDetailRow(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] cursor-pointer" style={{ background: "var(--bg)", color: "var(--muted)" }}>✕</button>
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
    </div>
  );
}
