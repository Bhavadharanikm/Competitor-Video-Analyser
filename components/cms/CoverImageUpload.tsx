"use client";
import { useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  clientPageId?: string;
  inputStyle: React.CSSProperties;
}

const MAX_DIMENSION = 1920;

/**
 * Downscales the image in the browser before it ever leaves the device — phone camera
 * photos can be 10MB+, well past Vercel's serverless request body limit (~4.5MB), which
 * rejects the upload at the platform level with a plain-text "Request Entity Too Large"
 * response our JSON parser then chokes on. Shrinking client-side keeps the upload small
 * regardless of the original file size (the server still re-compresses it again via sharp).
 */
async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 4 * 1024 * 1024) return file; // already small enough

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * Upload control for an Instagram Reel cover image — uploads to Supabase Storage via
 * /api/cms/upload-thumbnail and fills the resulting public URL into cover_url, which
 * Meta fetches once at publish time (see lib/meta.ts's REELS branch).
 */
export default function CoverImageUpload({ value, onChange, clientPageId, inputStyle }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (rawFile: File) => {
    setUploading(true);
    setError(null);
    try {
      const file = await downscaleImage(rawFile);
      const form = new FormData();
      form.append("file", file);
      if (clientPageId) form.append("client_page_id", clientPageId);
      const res = await fetch("/api/cms/upload-thumbnail", { method: "POST", body: form });
      const text = await res.text();
      let data: { url?: string; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(res.status === 413 ? "Image is too large — try a smaller photo." : "Upload failed unexpectedly.");
      }
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="w-14 h-14 rounded-[8px] object-cover flex-shrink-0" style={{ border: "1px solid var(--border)" }} />
        )}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://… or upload below"
            className="flex-1 rounded-[8px] px-3 py-2 text-[13px] outline-none"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 rounded-[8px] text-[12px] font-semibold cursor-pointer disabled:opacity-50 flex-shrink-0"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >{uploading ? "Uploading…" : "Upload"}</button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {error && <p className="text-[11px]" style={{ color: "#EF4444" }}>{error}</p>}
    </div>
  );
}
