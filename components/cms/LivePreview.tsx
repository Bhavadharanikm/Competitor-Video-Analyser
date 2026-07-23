"use client";
import DriveMediaPreview from "./DriveMediaPreview";
import { thumbGradient } from "./thumbGradient";

const ACTIVE_COLOR = "#2563EB";

interface Props {
  contentType: string; // feed_post | reel | story
  handle: string;
  caption: string;
  mediaUrl: string;
  coverUrl?: string;
}

/**
 * The Instagram-style preview shown in both Compose (new posts) and the entry detail
 * modal (editing existing ones) — kept as one component so the two stay visually and
 * behaviorally identical instead of drifting apart.
 */
export default function LivePreview({ contentType, handle, caption, mediaUrl, coverUrl }: Props) {
  const previewThumb = mediaUrl.trim();
  const displayHandle = handle || "client";
  const avatarLetter = displayHandle.slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--muted)" }}>Live preview</p>

      {contentType === "feed_post" && (
        <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: ACTIVE_COLOR, color: "#fff" }}>
              {avatarLetter}
            </div>
            <span className="text-[13px] font-bold flex-1" style={{ color: "var(--text)" }}>{displayHandle}</span>
            <span style={{ color: "var(--muted)" }}>•••</span>
          </div>
          <div className="w-full aspect-square overflow-hidden" style={{ background: "var(--bg)" }}>
            <DriveMediaPreview
              url={previewThumb}
              className="w-full h-full object-cover"
              fallback={<div className="w-full h-full" style={previewThumb ? { background: thumbGradient(previewThumb) } : undefined} />}
            />
          </div>
          <div className="flex items-center gap-3 px-4 pt-3 text-[18px]" style={{ color: "var(--text)" }}>
            <span>♡</span><span>💬</span><span>➤</span>
            <span className="ml-auto">🔖</span>
          </div>
          <div className="px-4 pb-4 pt-2">
            <p className="text-[13px] leading-snug" style={{ color: "var(--text)" }}>
              <span className="font-bold">{displayHandle}</span> {caption.trim() ? (caption.length > 140 ? caption.slice(0, 140) + "…" : caption) : <span style={{ color: "var(--muted)" }}>Your caption will appear here…</span>}
            </p>
          </div>
        </div>
      )}

      {contentType === "reel" && (
        <div className="relative rounded-[20px] overflow-hidden mx-auto w-full max-w-[280px] aspect-[9/16]" style={{ background: "#1a1a1a" }}>
          <DriveMediaPreview
            url={previewThumb}
            poster={coverUrl}
            className="absolute inset-0 w-full h-full object-cover"
            fallback={<div className="absolute inset-0" style={previewThumb ? { background: thumbGradient(previewThumb) } : undefined} />}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 20%, transparent 60%, rgba(0,0,0,0.65) 100%)" }} />

          <div className="absolute top-3 left-3 text-[12px] font-bold text-white flex items-center gap-1.5 pointer-events-none">
            <span style={{ fontSize: 15 }}>▶</span> Reels
          </div>

          <div className="absolute right-2.5 bottom-16 flex flex-col items-center gap-4 text-white pointer-events-none">
            <div className="flex flex-col items-center gap-0.5"><span className="text-[22px]">♡</span><span className="text-[11px] font-semibold">0</span></div>
            <div className="flex flex-col items-center gap-0.5"><span className="text-[20px]">💬</span><span className="text-[11px] font-semibold">0</span></div>
            <div className="flex flex-col items-center gap-0.5"><span className="text-[20px]">➤</span></div>
            <span className="text-[18px]">⋯</span>
            <div className="w-6 h-6 rounded-[6px] mt-1" style={{ background: "rgba(255,255,255,0.25)", border: "1.5px solid #fff" }} />
          </div>

          <div className="absolute left-3 right-14 bottom-3 text-white pointer-events-none">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: ACTIVE_COLOR }}>
                {avatarLetter}
              </div>
              <span className="text-[13px] font-bold">{displayHandle}</span>
            </div>
            <p className="text-[12.5px] leading-snug mb-1.5">
              {caption.trim() ? (caption.length > 90 ? caption.slice(0, 90) + "…" : caption) : <span style={{ opacity: 0.7 }}>Your caption will appear here…</span>}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ opacity: 0.9 }}>
              <span>♫</span> Original audio
            </div>
          </div>
        </div>
      )}

      {contentType === "story" && (
        <div className="relative rounded-[20px] overflow-hidden mx-auto w-full max-w-[280px] aspect-[9/16]" style={{ background: "#1a1a1a" }}>
          <DriveMediaPreview
            url={previewThumb}
            className="absolute inset-0 w-full h-full object-cover"
            fallback={<div className="absolute inset-0" style={previewThumb ? { background: thumbGradient(previewThumb) } : undefined} />}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 80%, rgba(0,0,0,0.25) 100%)" }} />

          <div className="absolute top-2 left-2 right-2 flex gap-1 pointer-events-none">
            <div className="flex-1 h-[2.5px] rounded-full" style={{ background: "rgba(255,255,255,0.9)" }} />
          </div>

          <div className="absolute top-5 left-3 right-3 flex items-center gap-2 text-white pointer-events-none">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: ACTIVE_COLOR, border: "1.5px solid #fff" }}>
              {avatarLetter}
            </div>
            <span className="text-[13px] font-bold flex-1">{displayHandle}</span>
            <span className="text-[12px]" style={{ opacity: 0.85 }}>now</span>
            <span className="text-[16px] ml-1">✕</span>
          </div>

          <div className="absolute left-0 right-0 bottom-4 text-center text-[11px] pointer-events-none" style={{ color: "rgba(255,255,255,0.75)" }}>
            Stories can&rsquo;t carry a caption via the API — only the photo/video posts.
          </div>
        </div>
      )}

      <p className="text-[12px]" style={{ color: "var(--muted)" }}>
        Preview is approximate — the media above is your actual file, but Meta&rsquo;s real post layout, cropping, and UI may differ slightly.
      </p>
    </div>
  );
}
