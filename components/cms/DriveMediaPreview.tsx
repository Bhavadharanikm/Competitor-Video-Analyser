"use client";
import { useEffect, useRef, useState } from "react";

const isDriveUrl = (url: string) => /drive\.google\.com/i.test(url);
const isVideoExt = (url: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
const isImageExt = (url: string) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);

interface Props {
  url: string;
  className?: string;
  fallback?: React.ReactNode;
  /** Shown as the video's poster frame while it loads/before it starts playing — NOT a
   *  substitute for the video itself, since Instagram always plays the real video. */
  poster?: string;
}

function PlayPauseOverlay({ paused }: { paused: boolean }) {
  if (!paused) return null;
  // z-index must be explicit (not "auto") — <video> elements commonly get their own GPU
  // compositing layer for hardware-accelerated decode, which can visually paint above
  // sibling overlays regardless of DOM order unless the overlay has its own stacking context.
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: "rgba(0,0,0,0.15)", zIndex: 10 }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
        <span style={{ color: "#fff", fontSize: 22, marginLeft: 3 }}>▶</span>
      </div>
    </div>
  );
}

/**
 * Renders the actual video/image behind a media URL by reusing our existing Drive proxy
 * (Meta already fetches through the same route to publish, so this is a real preview of
 * exactly what gets sent — not a re-encode, just a pass-through of the source bytes).
 * Videos autoplay muted/looped and toggle play/pause on click, like Reels/Stories do.
 */
export default function DriveMediaPreview({ url, className, fallback, poster }: Props) {
  const [kind, setKind] = useState<"video" | "image" | "loading" | "error">("loading");
  // Assume paused until an actual "play" event fires — autoplay can be silently blocked
  // by the browser (e.g. multiple videos autoplaying at once), and if we default this to
  // false we'd show no pause overlay even though the video never actually started.
  const [paused, setPaused] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trimmed = url.trim();
  const proxyUrl = isDriveUrl(trimmed) ? `/api/cms/media?url=${encodeURIComponent(trimmed)}` : trimmed;
  const posterUrl = poster?.trim() ? (isDriveUrl(poster.trim()) ? `/api/cms/media?url=${encodeURIComponent(poster.trim())}` : poster.trim()) : undefined;

  useEffect(() => {
    if (!trimmed) return;
    setKind("loading");

    if (!isDriveUrl(trimmed)) {
      if (isVideoExt(trimmed)) { setKind("video"); return; }
      if (isImageExt(trimmed)) { setKind("image"); return; }
      setKind("video"); // best guess for an unrecognized direct URL
      return;
    }

    let cancelled = false;
    fetch(proxyUrl, { method: "HEAD" })
      .then(res => {
        if (cancelled) return;
        if (!res.ok) throw new Error("not ok");
        const type = res.headers.get("content-type") ?? "";
        setKind(type.startsWith("image/") ? "image" : "video");
      })
      .catch(() => { if (!cancelled) setKind("error"); });
    return () => { cancelled = true; };
  }, [trimmed, proxyUrl]);

  if (!trimmed) return <>{fallback}</>;
  if (kind === "loading") return <>{fallback}</>;
  if (kind === "error") return <>{fallback}</>;
  if (kind === "video") {
    const togglePlay = () => {
      const el = videoRef.current;
      if (!el) return;
      if (el.paused) el.play(); else el.pause();
    };
    return (
      <div className={className} style={{ position: "relative", overflow: "hidden", cursor: "pointer" }} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={proxyUrl}
          poster={posterUrl}
          className="w-full h-full object-cover block"
          muted
          loop
          autoPlay
          playsInline
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
          onError={() => setKind("error")}
        />
        <PlayPauseOverlay paused={paused} />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={proxyUrl} className={className} alt="" onError={() => setKind("error")} />;
}
