import { NextRequest, NextResponse } from "next/server";
import { extractDriveFileId, getDriveFileMeta, streamDriveFile } from "@/lib/googleDrive";
import { Readable } from "stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/cms/media?url=<google-drive-url-or-id>
// Downloads the file server-side (via the Drive service account) and streams it back
// with a proper Content-Type — Meta fetches THIS url, never the raw Drive link directly,
// since Drive's viewer/share links don't serve raw file bytes.
export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get("url");
    if (!urlParam) return NextResponse.json({ error: "url required" }, { status: 400 });

    const fileId = extractDriveFileId(urlParam);
    if (!fileId) return NextResponse.json({ error: "Could not extract a Drive file ID from that URL" }, { status: 400 });

    const meta = await getDriveFileMeta(fileId);
    const stream = await streamDriveFile(fileId);
    const webStream = Readable.toWeb(stream as unknown as Readable) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": meta.mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
