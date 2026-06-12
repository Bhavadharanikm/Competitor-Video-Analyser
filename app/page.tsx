"use client";

import { useCallback, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type InputMode = "link" | "upload";
type JobState = "idle" | "running" | "done" | "error";

type Stage = { label: string; detail: string };
const STAGES: Stage[] = [
  { label: "Load",     detail: "Reading video source"     },
  { label: "Process",  detail: "Saving to Google Drive"   },
  { label: "Analyse",  detail: "Running video analysis"   },
];

const DRIVE_FOLDER = { name: "Competitor Clips", id: "1_xWEffueiPstS1vhal24THu-S21fM_SB" };

type RecentItem = {
  name: string;
  source: "Drive link" | "Upload";
  size: string;
  time: string;
};

const SEED_RECENTS: RecentItem[] = [
  { name: "mirrored-cabin-giveaway.mp4", source: "Drive link", size: "24.1 MB", time: "Today · 7:42 PM"      },
  { name: "hot-tub-sunset-reel.mp4",     source: "Upload",     size: "18.7 MB", time: "Today · 6:15 PM"      },
  { name: "lakehouse-walkthrough.mp4",   source: "Drive link", size: "31.2 MB", time: "Yesterday · 2:08 PM"  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function validateDriveLink(raw: string): { ok: boolean; error?: string } {
  if (!raw.trim()) return { ok: false, error: "Paste a Google Drive link to get started." };
  try {
    const url = new URL(raw.trim());
    if (url.hostname.includes("drive.google.com")) return { ok: true };
    return { ok: false, error: "That doesn't look like a Google Drive link." };
  } catch {
    return { ok: false, error: "Include the full URL starting with https://" };
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Page() {
  const [mode, setMode]         = useState<InputMode>("link");
  const [link, setLink]         = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [job, setJob]           = useState<JobState>("idle");
  const [stageIndex, setStageIndex] = useState(-1);
  const [error, setError]       = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [recents, setRecents]   = useState<RecentItem[]>(SEED_RECENTS);
  const fileRef = useRef<HTMLInputElement>(null);
  const timers  = useRef<ReturnType<typeof setTimeout>[]>([]);

  const progressPct =
    job === "idle" ? 0 :
    job === "done" ? 100 :
    Math.min(((stageIndex + 0.6) / STAGES.length) * 100, 96);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setJob("idle");
    setStageIndex(-1);
    setError(null);
    setLastSaved(null);
  }, []);

  const startJob = useCallback(() => {
    if (mode === "link") {
      const check = validateDriveLink(link);
      if (!check.ok) { setError(check.error ?? "Invalid link."); return; }
    } else {
      if (!file) { setError("Choose a video file first."); return; }
    }

    setError(null);
    setLastSaved(null);
    setJob("running");
    setStageIndex(0);

    /* TODO: replace simulation with real API call
       POST /api/analyse  { link } or multipart upload
       Stream SSE stage updates back, then return { name, driveUrl }
    */
    const stepMs = 1600;
    STAGES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setStageIndex(i), i * stepMs));
    });
    timers.current.push(
      setTimeout(() => {
        setJob("done");
        setStageIndex(STAGES.length);
        const name = mode === "upload" && file
          ? file.name
          : (link.split("/").find(s => s.length > 10 && !s.includes(".")) ?? "clip") + ".mp4";
        setLastSaved(name);
        setRecents(r => [{
          name,
          source: mode === "link" ? "Drive link" : "Upload",
          size: mode === "upload" && file ? formatBytes(file.size) : "—",
          time: "Just now",
        }, ...r]);
      }, STAGES.length * stepMs)
    );
  }, [mode, link, file]);

  /* Drag-and-drop handlers */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith("video/")) { setFile(dropped); setError(null); }
    else setError("Only video files are supported.");
  };

  const canSubmit = mode === "link" ? link.trim().length > 0 : file !== null;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 pb-24 pt-12 sm:px-8">

      {/* Header */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink">
            <DownloadIcon />
          </div>
          <span className="font-display text-lg font-semibold">Clip Vault</span>
        </div>
        <span className="text-sm text-mist">Hidden Gem Media</span>
      </header>

      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
          Any clip.<br />Straight to Drive.
        </h1>
        <p className="mt-4 text-base text-mist">
          Paste a Google Drive link or upload a video. Get it saved and analysed, seconds later.
        </p>
      </div>

      {/* Input card */}
      <section className="rounded-2xl border border-line bg-card p-6 shadow-sm">

        {/* Mode toggle */}
        <div className="mb-5 flex gap-2">
          {(["link", "upload"] as InputMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                mode === m
                  ? "bg-ink text-white"
                  : "border border-line bg-white text-mist hover:text-ink"
              }`}
            >
              {m === "link" ? "Drive link" : "Upload video"}
            </button>
          ))}
        </div>

        {/* Link input */}
        {mode === "link" && (
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://drive.google.com/file/d/…"
              value={link}
              onChange={e => { setLink(e.target.value); if (error) setError(null); }}
              onKeyDown={e => e.key === "Enter" && job !== "running" && startJob()}
              className="w-full flex-1 rounded-xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink placeholder:text-mist/60 focus:outline-none focus:ring-2 focus:ring-emerald/30"
            />
            <SubmitButton job={job} canSubmit={canSubmit} onStart={startJob} onReset={reset} onNew={() => { reset(); setLink(""); }} />
          </div>
        )}

        {/* Upload drop zone */}
        {mode === "upload" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm transition-colors ${
                dragging
                  ? "border-emerald bg-emerald/5"
                  : file
                  ? "border-emerald/40 bg-emerald/5"
                  : "border-line bg-white hover:border-mist"
              }`}
            >
              {file ? (
                <>
                  <FilmIcon className="text-emerald" />
                  <span className="font-medium text-ink">{file.name}</span>
                  <span className="text-mist">{formatBytes(file.size)}</span>
                </>
              ) : (
                <>
                  <UploadIcon className="text-mist" />
                  <span className="text-mist">Drop a video here or <span className="font-semibold text-ink">browse</span></span>
                  <span className="text-xs text-mist/70">MP4, MOV, WebM — any size</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); setError(null); }
              }}
            />
            <SubmitButton job={job} canSubmit={canSubmit} onStart={startJob} onReset={reset} onNew={() => { reset(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }} />
          </div>
        )}

        {error && <p className="mt-3 text-sm font-medium text-[#B4452E]">{error}</p>}

        {/* Destination row */}
        <div className="mt-5 flex items-center gap-2 text-sm text-mist">
          <DriveGlyph />
          <span>Saving to</span>
          <span className="font-semibold text-ink">{DRIVE_FOLDER.name}</span>
          <button className="ml-1 text-xs font-medium text-emerald hover:underline">Change</button>
        </div>
      </section>

      {/* Pipeline */}
      <section className="mt-6" aria-live="polite">
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          {/* Progress bar */}
          <div className="relative h-1 bg-line">
            <div
              className="absolute inset-y-0 left-0 bg-emerald transition-[width] duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Stages */}
          <div className="grid grid-cols-3 divide-x divide-line">
            {STAGES.map((s, i) => {
              const state =
                job === "idle" ? "idle"
                : i < stageIndex || job === "done" ? "done"
                : i === stageIndex ? "active"
                : "idle";
              return (
                <div key={s.label} className={`flex items-center gap-3 px-5 py-4 ${state === "active" ? "bg-emerald/5" : ""}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    state === "done"   ? "bg-emerald text-white"
                    : state === "active" ? "border-2 border-emerald text-emerald"
                    : "border border-line text-mist"
                  }`}>
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${state === "idle" ? "text-mist" : "text-ink"}`}>{s.label}</p>
                    <p className="hidden text-xs text-mist sm:block">{s.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Done banner */}
        {job === "done" && lastSaved && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-emerald/30 bg-emerald/5 px-4 py-3">
            <DriveGlyph />
            <p className="text-sm">
              <span className="font-mono font-medium">{lastSaved}</span>{" "}
              saved to <span className="font-semibold">{DRIVE_FOLDER.name}</span>
            </p>
            <a
              href={`https://drive.google.com/drive/folders/${DRIVE_FOLDER.id}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-sm font-semibold text-emerald hover:underline"
            >
              Open folder →
            </a>
          </div>
        )}
      </section>

      {/* Recent */}
      <section className="mt-10">
        <h2 className="mb-3 font-display text-base font-semibold">Recent</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-line font-mono text-[10px] uppercase tracking-widest text-mist">
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {recents.map((r, i) => (
                <tr key={i} className="border-b border-line/60 last:border-b-0 hover:bg-line/20">
                  <td className="px-4 py-3 font-mono text-[13px]">{r.name}</td>
                  <td className="px-4 py-3 text-mist">{r.source}</td>
                  <td className="px-4 py-3 text-mist">{r.size}</td>
                  <td className="px-4 py-3 text-mist">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function SubmitButton({ job, canSubmit, onStart, onReset, onNew }: {
  job: JobState; canSubmit: boolean;
  onStart: () => void; onReset: () => void; onNew: () => void;
}) {
  if (job === "running") {
    return (
      <button onClick={onReset} className="rounded-xl border border-line bg-white px-6 py-3 text-sm font-semibold text-ink hover:border-mist sm:self-start">
        Cancel
      </button>
    );
  }
  if (job === "done") {
    return (
      <button onClick={onNew} className="rounded-xl bg-pine px-6 py-3 text-sm font-semibold text-white hover:bg-ink sm:self-start">
        New clip
      </button>
    );
  }
  return (
    <button
      onClick={onStart}
      disabled={!canSubmit}
      className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pine disabled:opacity-40 sm:self-start"
    >
      Save to Drive
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 16V8M9 11l3-3 3 3M5 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}

function DriveGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 3h7l6 10.5-3.5 6h-12l-3.5-6L8.5 3z" fill="none" stroke="#0E7C56" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8.5 3L15 14.5M15.5 3L9 14.5M2.5 13.5h13" stroke="#0E7C56" strokeWidth="1.2" opacity=".5"/>
    </svg>
  );
}
