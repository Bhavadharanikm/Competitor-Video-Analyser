import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "cms-thumbnails";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — Reel cover images are small stills, not video.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Meta recommends 1080x1920 (9:16) for Reels covers. We cap the longest edge instead of
// force-cropping to that ratio, since covers can legitimately come in other aspect ratios.
const MAX_DIMENSION = 1920;

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return { url, key };
}

// POST /api/cms/upload-thumbnail — accepts a multipart file upload, stores it in the
// public "cms-thumbnails" Supabase Storage bucket, and returns its permanent public URL
// for use as an Instagram Reel cover_url (or a Facebook custom_thumbnail_url).
export async function POST(req: NextRequest) {
  try {
    const { url, key } = getEnv();
    const form = await req.formData();
    const file = form.get("file");
    const clientPageId = form.get("client_page_id");

    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only JPEG, PNG, or WEBP images are supported" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });

    // Downscale oversized covers (e.g. straight-off-camera stills) to Meta's recommended
    // Reels cover dimensions and re-compress, so we're not shipping multi-MB images that
    // may exceed what Meta's cover_url ingestion actually accepts.
    const resized = await sharp(await file.arrayBuffer())
      .rotate() // apply EXIF orientation before resizing, then strip metadata
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const path = `${crypto.randomUUID()}.jpg`;

    const uploadRes = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "image/jpeg",
      },
      body: resized,
    });
    if (!uploadRes.ok) return NextResponse.json({ error: await uploadRes.text() }, { status: 500 });

    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`;

    await fetch(`${url}/rest/v1/CMS_Thumbnails`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        client_page_id: typeof clientPageId === "string" ? clientPageId : null,
        file_name: file.name,
        storage_path: path,
        public_url: publicUrl,
        content_type: "image/jpeg",
        size_bytes: resized.byteLength,
      }),
    });

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
