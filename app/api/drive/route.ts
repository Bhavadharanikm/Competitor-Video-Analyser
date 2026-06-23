import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get("folderId");
  if (!folderId) return NextResponse.json({ error: "Missing folderId" }, { status: 400 });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Google API key not configured" }, { status: 500 });

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&orderBy=name&key=${apiKey}`,
      { cache: "no-store" }
    );

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error?.message ?? "Drive API error" }, { status: res.status });

    const files = (data.files ?? []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name }));
    return NextResponse.json({ files });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
