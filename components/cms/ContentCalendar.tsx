"use client";
import { useEffect, useMemo, useState } from "react";

const ACTIVE_COLOR = "#2563EB";
const ACTIVE_GLOW = "rgba(37,99,235,0.25)";
// Warm beige surfaces used across the calendar card, instead of the app's default stark white.
const CAL_BG = "#FAF7F1";
const CAL_ALT_BG = "#F1EBDF";

interface Client {
  page_id: string;
  name: string;
  instagram_account_id: string | null;
}

interface CalendarEntry {
  id: string;
  client_page_id: string;
  client_name: string;
  instagram_account_id: string | null;
  title: string;
  caption: string | null;
  media_url: string | null;
  platform: string;
  content_type: string;
  status: string;
  scheduled_at: string;
  link_url: string | null;
  custom_thumbnail_url: string | null;
  thumb_offset_seconds: number | null;
  location_id: string | null;
  user_tags: string | null;
  collaborators: string | null;
  share_to_feed: boolean;
  fb_published: boolean;
  ig_published: boolean;
  fb_post_id: string | null;
  ig_post_id: string | null;
  publish_error: string | null;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  draft:      { label: "Draft",     color: "#6B7280", bg: "#6B7280" },
  in_review:  { label: "In Review", color: "#D97706", bg: "#D97706" },
  approved:   { label: "Approved",  color: "#16A34A", bg: "#16A34A" },
  sent:       { label: "Sent",      color: "#7C3AED", bg: "#7C3AED" },
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
// Monday-first weekday index (0=Mon .. 6=Sun)
function mondayIndex(d: Date) { return (d.getDay() + 6) % 7; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - mondayIndex(r)); r.setHours(0, 0, 0, 0); return r; }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

const CLIENT_STORAGE_KEY = "cms_selected_client";
const VIEW_STORAGE_KEY = "cms_calendar_view";

let iconIdCounter = 0;

/** Colorful little brand badges — Meta doesn't give us real logos to embed, so these are hand-drawn SVGs. */
function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path d="M15.5 8.5h-1.7c-.4 0-.8.4-.8.9V11h2.4l-.3 2.4h-2.1V19h-2.4v-5.6H8.7V11h1.9V9.1c0-1.9 1.1-3 3-3h2v2.4Z" fill="#fff" />
    </svg>
  );
}

function InstagramIcon({ size = 16 }: { size?: number }) {
  const [gid] = useState(() => `ig-grad-${iconIdCounter++}`);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="flex-shrink-0">
      <defs>
        <radialGradient id={gid} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="20%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="65%" stopColor="#d6249f" />
          <stop offset="100%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${gid})`} />
      <rect x="7.2" y="7.2" width="9.6" height="9.6" rx="3" fill="none" stroke="#fff" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="2.6" fill="none" stroke="#fff" strokeWidth="1.3" />
      <circle cx="15.2" cy="8.8" r="0.6" fill="#fff" />
    </svg>
  );
}

function PlatformIcons({ platform, size = 16 }: { platform: string; size?: number }) {
  return (
    <span className="flex items-center -space-x-1.5 flex-shrink-0">
      {(platform === "both" || platform === "facebook") && <FacebookIcon size={size} />}
      {(platform === "both" || platform === "instagram") && <InstagramIcon size={size} />}
    </span>
  );
}

export default function ContentCalendar() {
  const [view, setView] = useState<"month" | "week">(() => {
    if (typeof window === "undefined") return "month";
    return (localStorage.getItem(VIEW_STORAGE_KEY) as "month" | "week") ?? "month";
  });
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientPageId, setSelectedClientPageId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [addHour, setAddHour] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients]);

  const changeView = (v: "month" | "week") => {
    setView(v);
    if (typeof window !== "undefined") localStorage.setItem(VIEW_STORAGE_KEY, v);
  };

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${weekEnd.getFullYear()}`;

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const total = daysInMonth(cursor);
    const leadingBlanks = mondayIndex(first);
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = leadingBlanks; i > 0; i--) {
      const d = new Date(first);
      d.setDate(d.getDate() - i);
      cells.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= total; day++) {
      cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), inMonth: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, inMonth: false });
      if (cells.length >= 42) break;
    }
    return cells;
  }, [cursor]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const rangeStart = view === "week" ? weekStart : grid[0].date;
  const rangeEnd = view === "week" ? addDays(weekEnd, 1) : grid[grid.length - 1].date;

  const fetchEntries = () => {
    if (!selectedClientPageId) { setEntries([]); return; }
    setLoading(true);
    const from = rangeStart.toISOString();
    const to = rangeEnd.toISOString();
    fetch(`/api/cms/calendar?from=${from}&to=${to}&client_page_id=${selectedClientPageId}`)
      .then(r => r.json())
      .then(data => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, [cursor, view, selectedClientPageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchClients = (preserveSelection: boolean) => {
    setClientsLoading(true);
    fetch("/api/cms/clients")
      .then(r => r.json())
      .then(data => {
        const list: Client[] = data.clients ?? [];
        setClients(list);
        if (preserveSelection && selectedClientPageId && list.some(c => c.page_id === selectedClientPageId)) return;
        const stored = typeof window !== "undefined" ? localStorage.getItem(CLIENT_STORAGE_KEY) : null;
        const initial = list.find(c => c.page_id === stored)?.page_id ?? list[0]?.page_id ?? "";
        setSelectedClientPageId(initial);
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  };

  useEffect(() => { fetchClients(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClientChange = (pageId: string) => {
    setSelectedClientPageId(pageId);
    if (typeof window !== "undefined") localStorage.setItem(CLIENT_STORAGE_KEY, pageId);
  };

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncClients = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/cms/clients/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.text()) || "Sync failed");
      fetchClients(true);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSyncing(false);
    }
  };

  const entriesByDay = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const e of entries) {
      const key = e.scheduled_at.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [entries]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { draft: 0, in_review: 0, approved: 0, sent: 0 };
    for (const e of entries) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [entries]);

  const dateKey = (d: Date) => d.toISOString().slice(0, 10);

  const volumeByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      const key = e.scheduled_at.slice(0, 10);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [entries]);
  const maxVolume = Math.max(1, ...Object.values(volumeByDay));

  // Drag-and-drop reschedule: keeps the entry's original time-of-day unless an explicit hour is given (week view drop).
  const moveEntry = async (entryId: string, targetDate: Date, targetHour?: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    const original = new Date(entry.scheduled_at);
    const next = new Date(targetDate);
    next.setHours(targetHour ?? original.getHours(), targetHour != null ? 0 : original.getMinutes(), 0, 0);
    if (next.getTime() === original.getTime()) return;
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, scheduled_at: next.toISOString() } : e));
    setMoveError(null);
    try {
      const res = await fetch(`/api/cms/calendar?id=${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: next.toISOString() }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to reschedule");
    } catch (err) {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, scheduled_at: entry.scheduled_at } : e));
      setMoveError(err instanceof Error ? err.message : "Failed to reschedule");
    }
  };

  return (
    <div className="relative z-[1] rounded-3xl overflow-hidden" style={{ background: CAL_BG, border: "1px solid var(--border)" }}>
      {/* Client selector */}
      <div className="flex items-center gap-3 px-7 py-5" style={{ borderBottom: "1px solid var(--border)", background: CAL_BG }}>
        <span className="text-[13px] font-semibold tracking-widest uppercase flex-shrink-0" style={{ color: "var(--muted)" }}>Client</span>
        <select
          value={selectedClientPageId}
          onChange={e => handleClientChange(e.target.value)}
          disabled={clientsLoading || clients.length === 0}
          className="rounded-[8px] px-4 py-2.5 text-[15px] font-semibold outline-none cursor-pointer disabled:opacity-50"
          style={{ background: CAL_ALT_BG, border: `1.5px solid ${ACTIVE_COLOR}`, color: "var(--text)", minWidth: 260 }}
        >
          {clientsLoading && <option>Loading clients…</option>}
          {!clientsLoading && clients.length === 0 && <option value="">No clients synced yet</option>}
          {sortedClients.map(c => <option key={c.page_id} value={c.page_id}>{c.name}</option>)}
        </select>
        {clients.length > 0 && (
          <span className="text-[13px]" style={{ color: "var(--muted)" }}>{clients.length} client{clients.length !== 1 ? "s" : ""} synced</span>
        )}
        <button
          onClick={syncClients}
          disabled={syncing}
          className="ml-auto px-4 py-2 rounded-[8px] text-[13px] font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: CAL_ALT_BG, border: "1px solid var(--border)", color: "var(--text)" }}
        >{syncing ? "Syncing…" : "↻ Sync from Meta"}</button>
        {syncError && <span className="text-[13px]" style={{ color: "#EF4444" }}>{syncError}</span>}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-7 py-6 flex-wrap gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCursor(c => view === "month" ? new Date(c.getFullYear(), c.getMonth() - 1, 1) : addDays(c, -7))}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-[16px]"
            style={{ background: CAL_BG, border: "1px solid var(--border)", color: "var(--text)" }}
          >←</button>
          <h2 className="text-[26px] font-bold whitespace-nowrap" style={{ color: "var(--text)" }}>{view === "month" ? monthLabel : weekLabel}</h2>
          <button
            onClick={() => setCursor(c => view === "month" ? new Date(c.getFullYear(), c.getMonth() + 1, 1) : addDays(c, 7))}
            className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer text-[16px]"
            style={{ background: CAL_BG, border: "1px solid var(--border)", color: "var(--text)" }}
          >→</button>
          <button
            onClick={() => setCursor(view === "month" ? startOfMonth(new Date()) : new Date())}
            className="px-4 py-2 rounded-[8px] text-[14px] font-semibold cursor-pointer"
            style={{ background: CAL_BG, border: "1px solid var(--border)", color: "var(--muted)" }}
          >Today</button>

          <div className="flex items-center rounded-[9px] p-1 ml-1" style={{ background: CAL_BG, border: "1px solid var(--border)" }}>
            {(["month", "week"] as const).map(v => (
              <button
                key={v}
                onClick={() => changeView(v)}
                className="px-4 py-1.5 rounded-[7px] text-[14px] font-semibold cursor-pointer capitalize"
                style={v === view ? { background: ACTIVE_COLOR, color: "#fff" } : { background: "none", color: "var(--muted)" }}
              >{v}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          {Object.entries(STATUS_STYLES).map(([key, s]) => (
            <div key={key} className="flex items-center gap-1.5 text-[14px]" style={{ color: "var(--muted)" }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
              {s.label}{counts[key] > 0 ? ` (${counts[key]})` : ""}
            </div>
          ))}
          <button
            onClick={() => { setAddDate(dateKey(new Date())); setAddHour(null); setShowAdd(true); }}
            className="px-5 py-2.5 rounded-[10px] text-[14px] font-bold cursor-pointer"
            style={{ background: ACTIVE_COLOR, color: "#fff", boxShadow: `0 0 14px ${ACTIVE_GLOW}`, border: "none" }}
          >+ Add Entry</button>
        </div>
      </div>

      {moveError && (
        <div className="px-7 py-2.5 text-[14px]" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>{moveError}</div>
      )}

      {/* Post volume strip — "content peaking" view showing how many posts land on each day */}
      <div className="flex items-end gap-1 px-7 pt-5 pb-3" style={{ borderBottom: "1px solid var(--border)", background: CAL_BG }}>
        {(view === "week" ? weekDays : grid.filter(c => c.inMonth).map(c => c.date)).map((date, i) => {
          const key = dateKey(date);
          const vol = volumeByDay[key] ?? 0;
          const heightPx = 5 + Math.round((vol / maxVolume) * 36);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${vol} post${vol === 1 ? "" : "s"}`}>
              <div
                className="w-full rounded-t-[3px] transition-all"
                style={{ height: heightPx, background: vol > 0 ? ACTIVE_COLOR : "var(--border)", opacity: vol > 0 ? 1 : 0.5, maxWidth: 34 }}
              />
              <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>{date.getDate()}</span>
            </div>
          );
        })}
      </div>

      {view === "month" ? (
        <>
          {/* Weekday row */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)" }}>
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => (
              <div key={d} className="px-4 py-3 text-[13px] font-semibold tracking-widest" style={{ color: "var(--muted)" }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {grid.map(({ date, inMonth }, i) => {
              const key = dateKey(date);
              const dayEntries = entriesByDay[key] ?? [];
              const isDragOver = dragOverKey === key;
              return (
                <div
                  key={i}
                  className="min-h-[170px] px-4 py-3 flex flex-col gap-2 group cursor-pointer"
                  style={{
                    borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--border)" : "none",
                    borderBottom: "1px solid var(--border)",
                    background: isDragOver ? ACTIVE_GLOW : (inMonth ? CAL_BG : CAL_ALT_BG),
                  }}
                  onClick={() => { setAddDate(key); setAddHour(null); setShowAdd(true); }}
                  onDragOver={ev => { ev.preventDefault(); setDragOverKey(key); }}
                  onDragLeave={() => setDragOverKey(k => k === key ? null : k)}
                  onDrop={ev => {
                    ev.preventDefault();
                    setDragOverKey(null);
                    const id = ev.dataTransfer.getData("text/plain");
                    if (id) moveEntry(id, date);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[15px] font-semibold w-8 h-8 rounded-full flex items-center justify-center"
                      style={
                        key === dateKey(new Date())
                          ? { background: "var(--text)", color: "var(--surface)" }
                          : { color: inMonth ? "var(--text)" : "var(--muted)" }
                      }
                    >
                      {date.getDate()}
                    </span>
                    {dayEntries.length > 0 && (
                      <span className="text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: ACTIVE_COLOR, color: "#fff" }}>
                        {dayEntries.length}
                      </span>
                    )}
                  </div>
                  {dayEntries.map(e => {
                    const s = STATUS_STYLES[e.status] ?? STATUS_STYLES.draft;
                    return (
                      <div
                        key={e.id}
                        draggable
                        onDragStart={ev => ev.dataTransfer.setData("text/plain", e.id)}
                        onClick={ev => { ev.stopPropagation(); setSelectedEntry(e); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[13px] font-semibold truncate cursor-grab active:cursor-grabbing"
                        style={{ background: s.bg, color: "#fff" }}
                        title={e.title}
                      >
                        <PlatformIcons platform={e.platform} size={15} />
                        <span className="truncate">{e.title}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <WeekView
          weekDays={weekDays}
          entries={entries}
          dragOverKey={dragOverKey}
          setDragOverKey={setDragOverKey}
          onDrop={(id, date, hour) => moveEntry(id, date, hour)}
          onSelect={setSelectedEntry}
          onAddAt={(date, hour) => {
            setAddDate(dateKey(date));
            setShowAdd(true);
            setAddHour(hour);
          }}
        />
      )}

      {loading && (
        <div className="px-6 py-3 text-[11px]" style={{ color: "var(--muted)" }}>Loading…</div>
      )}

      {showAdd && addDate && (
        <AddEntryModal
          date={addDate}
          defaultTime={addHour != null ? `${String(addHour).padStart(2, "0")}:00` : "09:00"}
          clients={sortedClients}
          defaultClientPageId={selectedClientPageId}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); fetchEntries(); }}
        />
      )}

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

function WeekView({ weekDays, entries, dragOverKey, setDragOverKey, onDrop, onSelect, onAddAt }: {
  weekDays: Date[];
  entries: CalendarEntry[];
  dragOverKey: string | null;
  setDragOverKey: (updater: string | null | ((k: string | null) => string | null)) => void;
  onDrop: (id: string, date: Date, hour: number) => void;
  onSelect: (entry: CalendarEntry) => void;
  onAddAt: (date: Date, hour: number) => void;
}) {
  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM .. 11 PM
  const dateKey = (d: Date) => d.toISOString().slice(0, 10);
  const today = dateKey(new Date());

  const entriesBySlot = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const e of entries) {
      const d = new Date(e.scheduled_at);
      const key = `${dateKey(d)}-${d.getHours()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [entries]);

  const formatHour = (h: number) => {
    const period = h < 12 ? "AM" : "PM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12} ${period}`;
  };

  return (
    <div className="flex overflow-auto" style={{ maxHeight: 840 }}>
      <div className="flex-shrink-0 w-20" style={{ borderRight: "1px solid var(--border)" }}>
        <div className="h-14 sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border)", background: CAL_ALT_BG }} />
        {HOURS.map(h => (
          <div key={h} className="h-20 px-2.5 pt-1 text-[12px] font-semibold text-right" style={{ color: "var(--muted)" }}>
            {formatHour(h)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 min-w-[900px]">
        {weekDays.map((date, di) => {
          const key = dateKey(date);
          const isToday = key === today;
          return (
            <div key={di} style={{ borderRight: di < 6 ? "1px solid var(--border)" : "none" }}>
              <div
                className="h-14 flex flex-col items-center justify-center sticky top-0 z-10"
                style={{ borderBottom: "1px solid var(--border)", background: isToday ? CAL_BG : CAL_ALT_BG }}
              >
                <span className="text-[12px] font-semibold tracking-widest" style={{ color: "var(--muted)" }}>
                  {date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                </span>
                <span className="text-[16px] font-bold" style={isToday ? { color: ACTIVE_COLOR } : { color: "var(--text)" }}>{date.getDate()}</span>
              </div>
              {HOURS.map(h => {
                const slotKey = `${key}-${h}`;
                const slotEntries = entriesBySlot[slotKey] ?? [];
                const isDragOver = dragOverKey === slotKey;
                return (
                  <div
                    key={h}
                    className="h-20 px-1.5 py-1.5 flex flex-col gap-1.5 cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border)", background: isDragOver ? ACTIVE_GLOW : "transparent" }}
                    onClick={() => onAddAt(date, h)}
                    onDragOver={ev => { ev.preventDefault(); setDragOverKey(slotKey); }}
                    onDragLeave={() => setDragOverKey(k => k === slotKey ? null : k)}
                    onDrop={ev => {
                      ev.preventDefault();
                      setDragOverKey(null);
                      const id = ev.dataTransfer.getData("text/plain");
                      if (id) onDrop(id, date, h);
                    }}
                  >
                    {slotEntries.map(e => {
                      const s = STATUS_STYLES[e.status] ?? STATUS_STYLES.draft;
                      return (
                        <div
                          key={e.id}
                          draggable
                          onDragStart={ev => ev.dataTransfer.setData("text/plain", e.id)}
                          onClick={ev => { ev.stopPropagation(); onSelect(e); }}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-[5px] text-[12px] font-semibold truncate cursor-grab active:cursor-grabbing"
                          style={{ background: s.bg, color: "#fff" }}
                          title={e.title}
                        >
                          <PlatformIcons platform={e.platform} size={13} />
                          <span className="truncate">{e.title}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntryDetailModal({ entry, onClose, onChanged }: {
  entry: CalendarEntry;
  onClose: () => void;
  onChanged: () => void;
}) {
  const scheduled = new Date(entry.scheduled_at);
  const pad = (n: number) => String(n).padStart(2, "0");

  const [title, setTitle] = useState(entry.title);
  const [caption, setCaption] = useState(entry.caption ?? "");
  const [mediaUrl, setMediaUrl] = useState(entry.media_url ?? "");
  const [platform, setPlatform] = useState(entry.platform);
  const [contentType, setContentType] = useState(entry.content_type);
  const [status, setStatus] = useState(entry.status);
  const [date, setDate] = useState(`${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(scheduled.getDate())}`);
  const [time, setTime] = useState(`${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}`);
  const [linkUrl, setLinkUrl] = useState(entry.link_url ?? "");
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState(entry.custom_thumbnail_url ?? "");
  const [thumbOffsetSeconds, setThumbOffsetSeconds] = useState(entry.thumb_offset_seconds != null ? String(entry.thumb_offset_seconds) : "");
  const [locationId, setLocationId] = useState(entry.location_id ?? "");
  const [userTags, setUserTags] = useState(entry.user_tags ?? "");
  const [collaborators, setCollaborators] = useState(entry.collaborators ?? "");
  const [shareToFeed, setShareToFeed] = useState(entry.share_to_feed);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const includesInstagram = platform === "both" || platform === "instagram";
  const includesFacebook = platform === "both" || platform === "facebook";
  const isStory = contentType === "story";
  const isReel = contentType === "reel";

  const buildPatch = () => ({
    title: title.trim(),
    caption: isStory ? null : (caption.trim() || null),
    media_url: mediaUrl.trim() || null,
    platform,
    content_type: contentType,
    status,
    scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
    link_url: includesFacebook && !isStory ? (linkUrl.trim() || null) : null,
    custom_thumbnail_url: includesFacebook && !isStory ? (customThumbnailUrl.trim() || null) : null,
    thumb_offset_seconds: includesInstagram && !isStory && thumbOffsetSeconds ? Number(thumbOffsetSeconds) : null,
    location_id: includesInstagram && !isStory ? (locationId.trim() || null) : null,
    user_tags: includesInstagram && !isStory ? (userTags.trim() || null) : null,
    collaborators: includesInstagram && !isStory ? (collaborators.trim() || null) : null,
    share_to_feed: isReel ? shareToFeed : true,
  });

  const save = async (publishAfter: boolean) => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cms/calendar?id=${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPatch()),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update entry");

      if (publishAfter) {
        const pubRes = await fetch("/api/cms/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: entry.id }),
        });
        if (!pubRes.ok) throw new Error((await pubRes.text()) || "Publish failed");
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await fetch(`/api/cms/calendar?id=${entry.id}`, { method: "DELETE" });
      onChanged();
    } catch {
      setSaving(false);
    }
  };

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" };
  const needsFb = entry.platform === "both" || entry.platform === "facebook";
  const needsIg = entry.platform === "both" || entry.platform === "instagram";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl p-7 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "88vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <p className="text-[16px] font-bold" style={{ color: "var(--text)" }}>{entry.client_name}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0" style={{ background: "var(--bg)", color: "var(--muted)" }}>✕</button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5 text-[12px] rounded-[8px] px-3 py-2.5" style={{ background: "var(--bg)", color: "var(--muted)" }}>
            {needsFb && <p>Facebook: {entry.fb_published ? `✓ posted (${entry.fb_post_id})` : "not yet posted"}</p>}
            {needsIg && <p>Instagram: {entry.ig_published ? `✓ posted (${entry.ig_post_id})` : "not yet posted"}</p>}
          </div>

          {entry.publish_error && (
            <p className="text-[12px] rounded-[8px] px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444" }}>{entry.publish_error}</p>
          )}

          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Title</p>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Platform</p>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
                <option value="both">Facebook + Instagram</option>
                <option value="facebook">Facebook only</option>
                <option value="instagram">Instagram only</option>
              </select>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Post Type</p>
              <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
                <option value="feed_post">Feed Post</option>
                <option value="reel">Reel</option>
                <option value="story">Story</option>
              </select>
            </div>
          </div>

          {!isStory && (
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Caption</p>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none resize-none" style={inputStyle} />
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Media URL</p>
            <input type="text" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://…" className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
          </div>

          {includesFacebook && !isStory && (
            <div className="flex flex-col gap-3 rounded-[10px] px-3 py-3" style={{ background: "var(--bg)" }}>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#1877F2" }}>Facebook options</p>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Link URL</p>
                <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Custom thumbnail URL</p>
                <input type="text" value={customThumbnailUrl} onChange={e => setCustomThumbnailUrl(e.target.value)} placeholder="https://…" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
            </div>
          )}

          {includesInstagram && !isStory && (
            <div className="flex flex-col gap-3 rounded-[10px] px-3 py-3" style={{ background: "var(--bg)" }}>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#E1306C" }}>Instagram options</p>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Thumbnail frame offset (seconds)</p>
                <input type="number" min="0" step="0.1" value={thumbOffsetSeconds} onChange={e => setThumbOffsetSeconds(e.target.value)} className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Location ID</p>
                <input type="text" value={locationId} onChange={e => setLocationId(e.target.value)} className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Tag accounts</p>
                <input type="text" value={userTags} onChange={e => setUserTags(e.target.value)} placeholder="@username1, @username2" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Collaborators</p>
                <input type="text" value={collaborators} onChange={e => setCollaborators(e.target.value)} placeholder="@username1, @username2" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
              {isReel && (
                <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: "var(--text)" }}>
                  <input type="checkbox" checked={shareToFeed} onChange={e => setShareToFeed(e.target.checked)} />
                  Also share this Reel to feed
                </label>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Status</p>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
              </select>
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Time</p>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Date</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
          </div>

          {error && <p className="text-[12px]" style={{ color: "#EF4444" }}>{error}</p>}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={remove}
            disabled={saving}
            className="px-4 py-2.5 rounded-[10px] text-[12px] font-semibold cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "#EF4444", background: "none" }}
          >Delete</button>
          <button
            onClick={() => save(false)}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-[10px] text-[12px] font-semibold cursor-pointer disabled:opacity-40"
            style={{ border: "1px solid var(--border)", color: "var(--text)", background: "none" }}
          >Save</button>
          <button
            onClick={() => save(true)}
            disabled={saving || !title.trim() || status !== "approved"}
            className="flex-1 py-2.5 rounded-[10px] text-[12px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: ACTIVE_COLOR, color: "#fff", border: "none" }}
            title={status !== "approved" ? "Set status to Approved to enable publishing" : undefined}
          >{saving ? "Working…" : "Save & Publish"}</button>
        </div>
      </div>
    </div>
  );
}

function AddEntryModal({ date, defaultTime, clients, defaultClientPageId, onClose, onCreated }: {
  date: string;
  defaultTime?: string;
  clients: Client[];
  defaultClientPageId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [clientPageId, setClientPageId] = useState(defaultClientPageId || clients[0]?.page_id || "");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [platform, setPlatform] = useState("both");
  const [contentType, setContentType] = useState("feed_post");
  const [status, setStatus] = useState("draft");
  const [time, setTime] = useState(defaultTime ?? "09:00");
  const [linkUrl, setLinkUrl] = useState("");
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState("");
  const [thumbOffsetSeconds, setThumbOffsetSeconds] = useState("");
  const [locationId, setLocationId] = useState("");
  const [userTags, setUserTags] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const includesInstagram = platform === "both" || platform === "instagram";
  const includesFacebook = platform === "both" || platform === "facebook";
  const isStory = contentType === "story";
  const isReel = contentType === "reel";

  const submit = async () => {
    if (!title.trim() || !clientPageId) return;
    setSaving(true);
    setError(null);
    const client = clients.find(c => c.page_id === clientPageId);
    try {
      const res = await fetch("/api/cms/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_page_id: clientPageId,
          client_name: client?.name ?? "Unknown",
          instagram_account_id: client?.instagram_account_id ?? null,
          title: title.trim(),
          caption: isStory ? null : (caption.trim() || null),
          media_url: mediaUrl.trim() || null,
          platform,
          content_type: contentType,
          status,
          scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
          link_url: includesFacebook && !isStory ? (linkUrl.trim() || null) : null,
          custom_thumbnail_url: includesFacebook && !isStory ? (customThumbnailUrl.trim() || null) : null,
          thumb_offset_seconds: includesInstagram && !isStory && thumbOffsetSeconds ? Number(thumbOffsetSeconds) : null,
          location_id: includesInstagram && !isStory ? (locationId.trim() || null) : null,
          user_tags: includesInstagram && !isStory ? (userTags.trim() || null) : null,
          collaborators: includesInstagram && !isStory ? (collaborators.trim() || null) : null,
          share_to_feed: isReel ? shareToFeed : true,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to create entry");
      // Never auto-publishes — publishing only ever happens from an explicit "Publish" click
      // in the entry detail view, regardless of what status this entry is saved with.
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl p-7 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "88vh" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <p className="text-[16px] font-bold" style={{ color: "var(--text)" }}>New calendar entry</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: "var(--bg)", color: "var(--muted)" }}>✕</button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Client</p>
          <select value={clientPageId} onChange={e => setClientPageId(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
            {clients.length === 0 && <option value="">No clients synced yet</option>}
            {clients.map(c => <option key={c.page_id} value={c.page_id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Title</p>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Weekend reel" className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Platform</p>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
              <option value="both">Facebook + Instagram</option>
              <option value="facebook">Facebook only</option>
              <option value="instagram">Instagram only</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Post Type</p>
            <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
              <option value="feed_post">Feed Post</option>
              <option value="reel">Reel</option>
              <option value="story">Story</option>
            </select>
          </div>
        </div>

        {isStory && (
          <p className="text-[11px] leading-relaxed rounded-[8px] px-3 py-2.5" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}>
            Stories can&rsquo;t have a caption, link sticker, tags, or collaborators via the Meta API — only the photo/video itself gets posted.
          </p>
        )}

        {!isStory && (
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Caption (optional)</p>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none resize-none" style={inputStyle} />
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Media URL (optional)</p>
          <input type="text" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://…" className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
        </div>

        {includesFacebook && !isStory && (
          <div className="flex flex-col gap-3 rounded-[10px] px-3 py-3" style={{ background: "var(--bg)" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#1877F2" }}>Facebook options</p>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Link URL (optional)</p>
              <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://… (clickable in the post)" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
            </div>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Custom thumbnail URL (optional)</p>
              <input type="text" value={customThumbnailUrl} onChange={e => setCustomThumbnailUrl(e.target.value)} placeholder="https://…" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
            </div>
          </div>
        )}

        {includesInstagram && !isStory && (
          <div className="flex flex-col gap-3 rounded-[10px] px-3 py-3" style={{ background: "var(--bg)" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#E1306C" }}>Instagram options</p>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Thumbnail frame offset — seconds into video (optional)</p>
              <input type="number" min="0" step="0.1" value={thumbOffsetSeconds} onChange={e => setThumbOffsetSeconds(e.target.value)} placeholder="e.g. 2.5" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
            </div>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Location ID (optional)</p>
              <input type="text" value={locationId} onChange={e => setLocationId(e.target.value)} placeholder="Meta location ID" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
            </div>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Tag accounts (optional)</p>
              <input type="text" value={userTags} onChange={e => setUserTags(e.target.value)} placeholder="@username1, @username2" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
            </div>
            <div>
              <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Collaborators (optional)</p>
              <input type="text" value={collaborators} onChange={e => setCollaborators(e.target.value)} placeholder="@username1, @username2" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
            </div>
            {isReel && (
              <label className="flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: "var(--text)" }}>
                <input type="checkbox" checked={shareToFeed} onChange={e => setShareToFeed(e.target.checked)} />
                Also share this Reel to feed
              </label>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Status</p>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Time</p>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-1.5" style={{ color: "var(--muted)" }}>Date</p>
          <input type="text" value={date} disabled className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none opacity-60" style={inputStyle} />
        </div>

        {error && <p className="text-[12px]" style={{ color: "#EF4444" }}>{error}</p>}
        </div>

        <button
          onClick={submit}
          disabled={saving || !title.trim() || !clientPageId}
          className="w-full py-3 rounded-[10px] text-[12px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: ACTIVE_COLOR, color: "#fff", border: "none" }}
        >
          {saving ? "Saving…" : "Add to calendar"}
        </button>
      </div>
    </div>
  );
}
