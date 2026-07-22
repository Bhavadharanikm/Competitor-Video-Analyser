"use client";
import { useEffect, useState } from "react";

const isDriveUrl = (url: string) => /drive\.google\.com/i.test(url);
const isVideoExt = (url: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url);
const isImageExt = (url: string) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url);

interface Props {
  url: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Renders the actual video/image behind a media URL by reusing our existing Drive proxy
 * (Meta already fetches through the same route to publish, so this is a real preview of
 * exactly what gets sent — not a re-encode, just a pass-through of the source bytes).
 */
export default function DriveMediaPreview({ url, className, fallback }: Props) {
  const [kind, setKind] = useState<"video" | "image" | "loading" | "error">("loading");
  const trimmed = url.trim();
  const proxyUrl = isDriveUrl(trimmed) ? `/api/cms/media?url=${encodeURIComponent(trimmed)}` : trimmed;

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
    return <video src={proxyUrl} className={className} muted loop autoPlay playsInline onError={() => setKind("error")} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={proxyUrl} className={className} alt="" onError={() => setKind("error")} />;
}
