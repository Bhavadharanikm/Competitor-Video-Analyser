import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const runId = req.nextUrl.searchParams.get("runId");
    if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const res = await fetch(
      `${url}/rest/v1/Reel_Jobs?run_id=eq.${encodeURIComponent(runId)}&select=id,client_slug,property_tag,file_name,status,message,video_url,updated_at&order=updated_at.asc`,
      {
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Supabase error ${res.status}: ${text}` }, { status: 500 });
    }

    const jobs = await res.json();
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
