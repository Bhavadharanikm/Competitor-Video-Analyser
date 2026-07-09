import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/properties — returns all properties grouped by client
// { "FLOHOM": ["FLO15", "FLO16", ...], "Awayframes": [...] }
export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const params = new URLSearchParams({
      select: "Client_Slug,Property_Tag",
      Property_Tag: "not.is.null",
      limit: "5000",
    });

    const res = await fetch(`${url}/rest/v1/Client_Video_Analysis?${params.toString()}`, {
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

    const rows: { Client_Slug: string; Property_Tag: string }[] = await res.json();

    const grouped: Record<string, string[]> = {};
    for (const row of rows) {
      const client = row.Client_Slug;
      const tag = row.Property_Tag;
      if (!client || !tag) continue;
      if (!grouped[client]) grouped[client] = [];
      if (!grouped[client].includes(tag)) grouped[client].push(tag);
    }
    for (const key of Object.keys(grouped)) grouped[key].sort();

    return NextResponse.json({ properties: grouped });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
