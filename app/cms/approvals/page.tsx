"use client";
import { useEffect, useState } from "react";
import { PlatformIcons } from "@/components/cms/PlatformIcons";
import { thumbGradient } from "@/components/cms/thumbGradient";
import { EntryDetailModal, type CalendarEntry } from "@/components/cms/ContentCalendar";

const AVATAR_COLORS = ["#6B4A32", "#4A6B5A", "#2E5A8A", "#5A4A6B", "#8A5A34", "#4A5A8A"];
function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const STATUS_BADGES: Record<string, { label: string; bg: string; color: string }> = {
  in_review: { label: "Pending review", bg: "rgba(217,119,6,0.14)", color: "#B45309" },
  approved: { label: "Approved", bg: "rgba(22,163,74,0.14)", color: "#15803D" },
};

export default function ApprovalsPage() {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);

  const fetchEntries = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/cms/calendar?status=in_review").then(r => r.json()),
      fetch("/api/cms/calendar?status=approved").then(r => r.json()),
    ])
      .then(([review, approved]) => {
        const combined: CalendarEntry[] = [...(review.entries ?? []), ...(approved.entries ?? [])];
        combined.sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
        setEntries(combined.slice(0, 12));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, []);

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await fetch(`/api/cms/calendar?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setEntries(prev => prev.filter(e => e.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[1760px]">
      <div className="mb-8">
        <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
        <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Approvals</h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>Review and sign off on posts before they go live</p>
      </div>

      {loading && <p className="text-[13px]" style={{ color: "var(--muted)" }}>Loading…</p>}

      {!loading && entries.length === 0 && (
        <div className="rounded-[16px] p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>Nothing waiting on approval right now.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {entries.map(e => {
          const badge = STATUS_BADGES[e.status] ?? STATUS_BADGES.in_review;
          const scheduled = new Date(e.scheduled_at);
          const dateLabel = `${scheduled.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${scheduled.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toUpperCase()}`;
          return (
            <div
              key={e.id}
              className="rounded-[16px] overflow-hidden flex flex-col cursor-pointer"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              onClick={() => setSelectedEntry(e)}
            >
              <div
                className="relative w-full h-[160px] flex-shrink-0"
                style={e.custom_thumbnail_url
                  ? { backgroundImage: `url(${e.custom_thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: thumbGradient(e.id) }}
              >
                <span className="absolute top-3 left-3"><PlatformIcons platform={e.platform} size={22} /></span>
                <span
                  className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: badge.bg, color: badge.color, backdropFilter: "blur(4px)" }}
                >{badge.label}</span>
              </div>

              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: avatarColor(e.client_name) }}>
                    {initials(e.client_name)}
                  </div>
                  <span className="text-[13px] font-bold flex-1 truncate" style={{ color: "var(--text)" }}>{e.client_name}</span>
                  <span className="text-[12px] font-mono flex-shrink-0" style={{ color: "var(--muted)" }}>{dateLabel}</span>
                </div>

                <p className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{e.title}</p>
                {e.caption && (
                  <p className="text-[13px] leading-snug line-clamp-2" style={{ color: "var(--muted)" }}>{e.caption}</p>
                )}

                {e.status === "in_review" && (
                  <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={ev => { ev.stopPropagation(); setStatus(e.id, "approved"); }}
                      disabled={busyId === e.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[9px] text-[13px] font-bold cursor-pointer disabled:opacity-50"
                      style={{ background: "#16A34A", color: "#fff", border: "none" }}
                    >✓ Approve</button>
                    <button
                      onClick={ev => { ev.stopPropagation(); setStatus(e.id, "draft"); }}
                      disabled={busyId === e.id}
                      className="flex-1 py-2 rounded-[9px] text-[13px] font-semibold cursor-pointer disabled:opacity-50"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >Request changes</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onChanged={() => { setSelectedEntry(null); fetchEntries(); }}
        />
      )}
    </div>
  );
}
