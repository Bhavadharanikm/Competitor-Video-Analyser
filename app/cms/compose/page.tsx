"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCmsClient } from "@/components/cms/ClientContext";
import { FacebookIcon, InstagramIcon } from "@/components/cms/PlatformIcons";

const ACTIVE_COLOR = "#2563EB";
const CAPTION_LIMIT = 2200;

// Same deterministic warm-gradient placeholder used in the calendar's week view,
// shown wherever we don't have a real thumbnail image to render.
const THUMB_GRADIENTS = [
  "linear-gradient(160deg, #6B4A32, #B98A5E)",
  "linear-gradient(160deg, #8A5A34, #D9A066)",
  "linear-gradient(160deg, #C98A4B, #EFC48C)",
  "linear-gradient(160deg, #4A6B5A, #8FBFA3)",
  "linear-gradient(160deg, #5A4A6B, #A98FBF)",
  "linear-gradient(160deg, #6B5A4A, #D9BF8F)",
];
function thumbGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return THUMB_GRADIENTS[hash % THUMB_GRADIENTS.length];
}

function pad(n: number) { return String(n).padStart(2, "0"); }

export default function ComposePage() {
  const router = useRouter();
  const { sortedClients, selectedClientPageId } = useCmsClient();

  const [clientPageId, setClientPageId] = useState(selectedClientPageId);
  const client = sortedClients.find(c => c.page_id === clientPageId) ?? null;

  // The client list loads asynchronously in ClientContext, so the initial useState value
  // above is often still "" on first render — sync once it's actually populated.
  useEffect(() => {
    if (!clientPageId && selectedClientPageId) setClientPageId(selectedClientPageId);
  }, [selectedClientPageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [includeInstagram, setIncludeInstagram] = useState(true);
  const [includeFacebook, setIncludeFacebook] = useState(true);
  const [contentType, setContentType] = useState("feed_post");
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState("");
  const [thumbOffsetSeconds, setThumbOffsetSeconds] = useState("");
  const [locationId, setLocationId] = useState("");
  const [userTags, setUserTags] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [shareToFeed, setShareToFeed] = useState(true);
  const [linkUrl, setLinkUrl] = useState("");

  const now = useMemo(() => new Date(), []);
  const [date, setDate] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [time, setTime] = useState("09:00");

  const [saving, setSaving] = useState<"approve" | "review" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStory = contentType === "story";
  const isReel = contentType === "reel";
  const platform = includeInstagram && includeFacebook ? "both" : includeInstagram ? "instagram" : includeFacebook ? "facebook" : "";

  const submit = async (status: "in_review" | "approved") => {
    if (!platform || !clientPageId) return;
    setSaving(status === "approved" ? "approve" : "review");
    setError(null);
    try {
      const title = caption.trim().slice(0, 60) || "Untitled post";
      const res = await fetch("/api/cms/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_page_id: clientPageId,
          client_name: client?.name ?? "Unknown",
          instagram_account_id: client?.instagram_account_id ?? null,
          title,
          caption: isStory ? null : (caption.trim() || null),
          media_url: mediaUrl.trim() || null,
          platform,
          content_type: contentType,
          status,
          scheduled_at: new Date(`${date}T${time}:00`).toISOString(),
          link_url: includeFacebook && !isStory ? (linkUrl.trim() || null) : null,
          custom_thumbnail_url: includeFacebook && !isStory ? (customThumbnailUrl.trim() || null) : null,
          thumb_offset_seconds: includeInstagram && !isStory && thumbOffsetSeconds ? Number(thumbOffsetSeconds) : null,
          location_id: includeInstagram && !isStory ? (locationId.trim() || null) : null,
          user_tags: includeInstagram && !isStory ? (userTags.trim() || null) : null,
          collaborators: includeInstagram && !isStory ? (collaborators.trim() || null) : null,
          share_to_feed: isReel ? shareToFeed : true,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to create entry");
      router.push("/cms/calendar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(null);
    }
  };

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" };
  const previewThumb = customThumbnailUrl.trim() || mediaUrl.trim();
  const handle = (client?.name ?? "client").toLowerCase().replace(/[^a-z0-9]+/g, "");

  return (
    <div className="max-w-[1400px]">
      <div className="mb-8">
        <p className="text-[12px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--muted)" }}>Social Media Planner</p>
        <h1 className="text-[34px] font-bold" style={{ color: "var(--text)" }}>Compose</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Form */}
        <div className="rounded-3xl p-7 flex flex-col gap-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Client</p>
            <select value={clientPageId} onChange={e => setClientPageId(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none cursor-pointer" style={inputStyle}>
              {sortedClients.length === 0 && <option value="">No clients synced yet</option>}
              {sortedClients.map(c => <option key={c.page_id} value={c.page_id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Publish to</p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIncludeInstagram(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-bold cursor-pointer"
                style={{ background: "var(--bg)", border: `1.5px solid ${includeInstagram ? ACTIVE_COLOR : "var(--border)"}`, color: "var(--text)" }}
              >
                <InstagramIcon size={18} /> Instagram
                {includeInstagram && <span style={{ color: ACTIVE_COLOR }}>✓</span>}
              </button>
              <button
                onClick={() => setIncludeFacebook(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-bold cursor-pointer"
                style={{ background: "var(--bg)", border: `1.5px solid ${includeFacebook ? ACTIVE_COLOR : "var(--border)"}`, color: "var(--text)" }}
              >
                <FacebookIcon size={18} /> Facebook
                {includeFacebook && <span style={{ color: ACTIVE_COLOR }}>✓</span>}
              </button>
            </div>
            {!platform && <p className="text-[12px] mt-2" style={{ color: "#EF4444" }}>Select at least one network.</p>}
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Post type</p>
            <div className="flex items-center rounded-[9px] p-1 w-fit" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              {([["feed_post", "Feed Post"], ["reel", "Reel"], ["story", "Story"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setContentType(v)}
                  className="px-4 py-1.5 rounded-[7px] text-[13px] font-semibold cursor-pointer"
                  style={v === contentType ? { background: ACTIVE_COLOR, color: "#fff" } : { background: "none", color: "var(--muted)" }}
                >{label}</button>
              ))}
            </div>
          </div>

          {!isStory && (
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Caption</p>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value.slice(0, CAPTION_LIMIT))}
                rows={6}
                placeholder="Write your caption…"
                className="w-full rounded-[10px] px-3 py-2.5 text-[14px] outline-none resize-none"
                style={inputStyle}
              />
              <p className="text-[11px] mt-1 text-right" style={{ color: "var(--muted)" }}>{caption.length} / {CAPTION_LIMIT}</p>
            </div>
          )}

          {isStory && (
            <p className="text-[12px] leading-relaxed rounded-[8px] px-3 py-2.5" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}>
              Stories can&rsquo;t have a caption, link sticker, tags, or collaborators via the Meta API — only the photo/video itself gets posted.
            </p>
          )}

          <div>
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Media</p>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-[10px] flex-shrink-0" style={mediaUrl.trim() ? { background: thumbGradient(mediaUrl) } : { background: "var(--bg)", border: "1px dashed var(--border)" }} />
              <div className="flex-1">
                <input type="text" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://… (Google Drive video/image link)" className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
              </div>
            </div>
          </div>

          {includeFacebook && !isStory && (
            <div className="flex flex-col gap-3 rounded-[10px] px-4 py-4" style={{ background: "var(--bg)" }}>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#1877F2" }}>Facebook options</p>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Link URL</p>
                <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://… (clickable in the post)" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Custom thumbnail URL</p>
                <input type="text" value={customThumbnailUrl} onChange={e => setCustomThumbnailUrl(e.target.value)} placeholder="https://…" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
            </div>
          )}

          {includeInstagram && !isStory && (
            <div className="flex flex-col gap-3 rounded-[10px] px-4 py-4" style={{ background: "var(--bg)" }}>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#E1306C" }}>Instagram options</p>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Thumbnail frame offset (seconds)</p>
                <input type="number" min="0" step="0.1" value={thumbOffsetSeconds} onChange={e => setThumbOffsetSeconds(e.target.value)} placeholder="e.g. 2.5" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
              </div>
              <div>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--muted)" }}>Location ID</p>
                <input type="text" value={locationId} onChange={e => setLocationId(e.target.value)} placeholder="Meta location page ID" className="w-full rounded-[8px] px-3 py-2 text-[13px] outline-none" style={inputStyle} />
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
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Date</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--muted)" }}>Time</p>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full rounded-[8px] px-3 py-2.5 text-[13px] outline-none" style={inputStyle} />
            </div>
          </div>

          {error && <p className="text-[12px]" style={{ color: "#EF4444" }}>{error}</p>}

          <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => submit("in_review")}
              disabled={!!saving || !platform || !clientPageId}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-semibold cursor-pointer disabled:opacity-40"
              style={{ border: "1px solid var(--border)", color: "var(--text)", background: "none" }}
            >{saving === "review" ? "Sending…" : "Send for approval"}</button>
            <button
              onClick={() => submit("approved")}
              disabled={!!saving || !platform || !clientPageId}
              className="ml-auto px-6 py-2.5 rounded-[10px] text-[13px] font-bold cursor-pointer disabled:opacity-40 flex items-center gap-2"
              style={{ background: ACTIVE_COLOR, color: "#fff", border: "none" }}
            >{saving === "approve" ? "Scheduling…" : "➤ Schedule post"}</button>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6 flex flex-col gap-3">
          <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>Live preview</p>
          <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2.5 px-4 py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: ACTIVE_COLOR, color: "#fff" }}>
                {(client?.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <span className="text-[13px] font-bold flex-1" style={{ color: "var(--text)" }}>{handle || "client"}</span>
              <span style={{ color: "var(--muted)" }}>•••</span>
            </div>
            <div className="w-full aspect-square" style={previewThumb ? { background: thumbGradient(previewThumb) } : { background: "var(--bg)" }} />
            <div className="flex items-center gap-3 px-4 pt-3 text-[18px]" style={{ color: "var(--text)" }}>
              <span>♡</span><span>💬</span><span>➤</span>
              <span className="ml-auto">🔖</span>
            </div>
            <div className="px-4 pb-4 pt-2">
              <p className="text-[13px] leading-snug" style={{ color: "var(--text)" }}>
                <span className="font-bold">{handle || "client"}</span> {caption.trim() ? (caption.length > 140 ? caption.slice(0, 140) + "…" : caption) : <span style={{ color: "var(--muted)" }}>Your caption will appear here…</span>}
              </p>
            </div>
          </div>
          <p className="text-[12px]" style={{ color: "var(--muted)" }}>
            Preview is approximate — Meta renders the real post, and video thumbnails shown here are placeholders (we don&rsquo;t re-encode your video to preview it).
          </p>
        </div>
      </div>
    </div>
  );
}
