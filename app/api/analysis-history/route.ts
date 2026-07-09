import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const clientName = req.nextUrl.searchParams.get("clientName");

    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const params = new URLSearchParams({
      job_type: "eq.analysis",
      select: "id,client_slug,property_tag,file_name,status,message,updated_at,run_id",
      order: "updated_at.desc",
      limit: "15",
    });
    if (clientName) params.set("client_slug", `eq.${clientName}`);

    const res = await fetch(`${url}/rest/v1/Reel_Jobs?${params.toString()}`, {
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

    const history = await res.json();
    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
