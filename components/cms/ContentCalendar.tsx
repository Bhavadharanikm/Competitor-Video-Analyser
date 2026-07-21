"use client";
import { useEffect, useMemo, useState } from "react";

const ACTIVE_COLOR = "#2563EB";
const ACTIVE_GLOW = "rgba(37,99,235,0.25)";

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

const CLIENT_STORAGE_KEY = "cms_selected_client";

export default function ContentCalendar() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientPageId, setSelectedClientPageId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients]);

  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

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

  const fetchEntries = () => {
    if (!selectedClientPageId) { setEntries([]); return; }
    setLoading(true);
    const from = grid[0].date.toISOString();
    const to = grid[grid.length - 1].date.toISOString();
    fetch(`/api/cms/calendar?from=${from}&to=${to}&client_page_id=${selectedClientPageId}`)
      .then(r => r.json())
      .then(data => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEntries(); }, [cursor, selectedClientPageId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Client selector */}
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg)" }}>
        <span className="text-[11px] font-semibold tracking-widest uppercase flex-shrink-0" style={{ color: "var(--muted)" }}>Client</span>
        <select
          value={selectedClientPageId}
          onChange={e => handleClientChange(e.target.value)}
          disabled={clientsLoading || clients.length === 0}
          className="rounded-[8px] px-3 py-2 text-[13px] font-semibold outline-none cursor-pointer disabled:opacity-50"
          style={{ background: "var(--surface)", border: `1.5px solid ${ACTIVE_COLOR}`, color: "var(--text)", minWidth: 220 }}
        >
          {clientsLoading && <option>Loading clients…</option>}
          {!clientsLoading && clients.length === 0 && <option value="">No clients synced yet</option>}
          {sortedClients.map(c => <option key={c.page_id} value={c.page_id}>{c.name}</option>)}
        </select>
        {clients.length > 0 && (
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>{clients.length} client{clients.length !== 1 ? "s" : ""} synced</span>
        )}
        <button
          onClick={syncClients}
          disabled={syncing}
          className="ml-auto px-3 py-1.5 rounded-[8px] text-[11px] font-semibold cursor-pointer disabled:opacity-50"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
        >{syncing ? "Syncing…" : "↻ Sync from Meta"}</button>
        {syncError && <span className="text-[11px]" style={{ color: "#EF4444" }}>{syncError}</span>}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          >←</button>
          <h2 className="text-[20px] font-bold" style={{ color: "var(--text)" }}>{monthLabel}</h2>
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          >→</button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold cursor-pointer"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >Today</button>
        </div>

        <div className="flex items-center gap-4">
          {Object.entries(STATUS_STYLES).map(([key, s]) => (
            <div key={key} className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}{counts[key] > 0 ? ` (${counts[key]})` : ""}
            </div>
          ))}
          <button
            onClick={() => { setAddDate(dateKey(new Date())); setShowAdd(true); }}
            className="px-4 py-2 rounded-[10px] text-[12px] font-bold cursor-pointer"
            style={{ background: ACTIVE_COLOR, color: "#fff", boxShadow: `0 0 14px ${ACTIVE_GLOW}`, border: "none" }}
          >+ Add Entry</button>
        </div>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)" }}>
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(d => (
          <div key={d} className="px-4 py-2.5 text-[11px] font-semibold tracking-widest" style={{ color: "var(--muted)" }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {grid.map(({ date, inMonth }, i) => {
          const key = dateKey(date);
          const dayEntries = entriesByDay[key] ?? [];
          return (
            <div
              key={i}
              className="min-h-[120px] px-3 py-2.5 flex flex-col gap-1.5 group cursor-pointer"
              style={{
                borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--border)" : "none",
                borderBottom: "1px solid var(--border)",
                opacity: inMonth ? 1 : 0.35,
              }}
              onClick={() => { setAddDate(key); setShowAdd(true); }}
            >
              <span
                className="text-[13px] font-semibold w-6 h-6 rounded-full flex items-center justify-center"
                style={key === dateKey(new Date()) ? { background: "var(--text)", color: "var(--surface)" } : { color: "var(--text)" }}
              >
                {date.getDate()}
              </span>
              {dayEntries.map(e => {
                const s = STATUS_STYLES[e.status] ?? STATUS_STYLES.draft;
                return (
                  <div
                    key={e.id}
                    onClick={ev => { ev.stopPropagation(); setSelectedEntry(e); }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] font-semibold truncate cursor-pointer"
                    style={{ background: s.bg, color: "#fff" }}
                    title={e.title}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#fff" }} />
                    <span className="truncate">{e.title}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="px-6 py-3 text-[11px]" style={{ color: "var(--muted)" }}>Loading…</div>
      )}

      {showAdd && addDate && (
        <AddEntryModal
          date={addDate}
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

function AddEntryModal({ date, clients, defaultClientPageId, onClose, onCreated }: {
  date: string;
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
  const [time, setTime] = useState("09:00");
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
