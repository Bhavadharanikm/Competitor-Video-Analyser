"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCmsClient } from "@/components/cms/ClientContext";
import { PlatformIcons } from "@/components/cms/PlatformIcons";
import { thumbGradient } from "@/components/cms/thumbGradient";
import { EntryDetailModal, type CalendarEntry } from "@/components/cms/ContentCalendar";

const ACTIVE_COLOR = "#2563EB";

type Tab = "scheduled" | "drafts" | "published";

const TAB_STYLES: Record<Tab, { label: string; color: string }> = {
  scheduled: { label: "Scheduled", color: "#2563EB" },
  drafts: { label: "Draft", color: "#6B7280" },
  published: { label: "Published", color: "#16A34A" },
};

function platformLabel(platform: string) {
  if (platform === "both") return "Instagram + Facebook";
  if (platform === "instagram") return "Instagram";
  return "Facebook";
}

export default function QueuePage() {
  const router = useRouter();
  const { selectedClient, selectedClientPageId } = useCmsClient();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("scheduled");
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);

  const fetchEntries = () => {
    if (!selectedClientPageId) { setEntries([]); return; }
    setLoading(true);
    fetch(`/api/cms/calendar?client_page_id=${selectedClientPageId}`)
      .then(r => r.json())
      .then(data => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, [selectedClientPageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const scheduled = entries.filter(e => e.status === "approved").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const drafts = entries.filter(e => e.status === "draft" || e.status === "in_review").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const published = entries.filter(e => e.status === "sent").sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at));
    return { scheduled, drafts, published };
  }, [entries]);

  const activeList = grouped[tab === "drafts" ? "drafts" : tab];

  return (
    <div className="max-w-[1760px]">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
          <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Publishing queue</h1>
          {selectedClient && (
            <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
              Everything scheduled, drafted, and published for <span className="font-semibold" style={{ color: "var(--text)" }}>{selectedClient.name}</span>.
            </p>
          )}
        </div>
        <button
          onClick={() => router.push("/cms/compose")}
          className="px-5 py-2.5 rounded-[10px] text-[14px] font-bold cursor-pointer"
          style={{ background: ACTIVE_COLOR, color: "#fff", border: "none" }}
        >+ New post</button>
      </div>

      <div className="flex items-center gap-6 mb-5" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["scheduled", "drafts", "published"] as Tab[]).map(t => {
          const count = t === "drafts" ? grouped.drafts.length : t === "published" ? grouped.published.length : grouped.scheduled.length;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-2 pb-3 text-[15px] font-bold cursor-pointer"
              style={{
                color: active ? ACTIVE_COLOR : "var(--muted)",
                borderBottom: active ? `2px solid ${ACTIVE_COLOR}` : "2px solid transparent",
                marginBottom: -1,
                background: "none",
              }}
            >
              {t === "drafts" ? "Drafts" : t === "published" ? "Published" : "Scheduled"}
              <span
                className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: active ? ACTIVE_COLOR : "var(--surface)", color: active ? "#fff" : "var(--muted)", border: active ? "none" : "1px solid var(--border)" }}
              >{count}</span>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-[13px]" style={{ color: "var(--muted)" }}>Loading…</p>}

      {!loading && activeList.length === 0 && (
        <div className="rounded-[16px] p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-[14px]" style={{ color: "var(--muted)" }}>Nothing here yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {activeList.map(e => {
          const scheduled = new Date(e.scheduled_at);
          const dateLabel = scheduled.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const timeLabel = scheduled.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toUpperCase();
          const style = TAB_STYLES[tab === "drafts" && e.status === "in_review" ? "scheduled" : tab];
          const statusLabel = tab === "drafts" ? (e.status === "in_review" ? "In Review" : "Draft") : style.label;
          const statusColor = tab === "drafts" ? (e.status === "in_review" ? "#D97706" : "#6B7280") : style.color;
          return (
            <div
              key={e.id}
              onClick={() => setSelectedEntry(e)}
              className="flex items-center gap-4 rounded-[14px] px-4 py-3 cursor-pointer"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-14 h-14 rounded-[10px] flex-shrink-0"
                style={e.custom_thumbnail_url
                  ? { backgroundImage: `url(${e.custom_thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: thumbGradient(e.id) }}
              />
              <div className="w-20 flex-shrink-0">
                <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{dateLabel}</p>
                <p className="text-[12px] font-mono" style={{ color: "var(--muted)" }}>{timeLabel}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <PlatformIcons platform={e.platform} size={15} />
                  <span className="text-[12px] font-semibold" style={{ color: "var(--muted)" }}>{platformLabel(e.platform)}</span>
                </div>
                <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text)" }}>{e.title}</p>
              </div>
              <span className="text-[12px] font-bold flex-shrink-0" style={{ color: statusColor }}>{statusLabel}</span>
              <button
                onClick={ev => ev.stopPropagation()}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}
              >⋯</button>
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
