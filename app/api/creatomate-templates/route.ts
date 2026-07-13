import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const params = new URLSearchParams({
      select: "template_name,template_id,thumbnail_url,video_element_name,text_element_name,updated_at",
      order: "updated_at.desc",
    });

    const table = encodeURIComponent("Video Template List");
    const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Supabase error ${res.status}: ${text}` }, { status: 500 });
    }

    const templates = await res.json();
    return NextResponse.json({ templates });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
