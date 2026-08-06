import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Specific property tags to hide from the dropdown for a given client — new
// properties added later are unaffected and show up automatically.
const HIDDEN_PROPERTIES: Record<string, string[]> = {
  "Starlight Haven": [
    "A-Frame - Contenthouse",
    "Deer Run Treehouse - Contenthouse",
    "Exclusive Glamping Tent",
    "Firefly Ridge Treehouse - Contenthouse",
    "Geodesic Domes",
    "Geodesic Domes- Contenthouse",
    "Hot Springs",
    "Luxury Glamping Tent",
    "Modern Cabins - Contenthouse",
    "Modern Luxury Cabins",
    "Sunrise Point Treehouse",
    "Tents-contenthouse",
    "Weiss Lake A-frame",
  ],
};

// GET /api/properties — returns all properties grouped by client
// { "FLOHOM": ["FLO15", "FLO16", ...], "Awayframes": [...] }
export async function GET() {
  try {
    // Client/property data now lives in the separate "major client analysis"
    // Supabase project, not the Reel_Jobs/growth-jobs one.
    const url = process.env.CLIENT_ANALYSIS_SUPABASE_URL;
    const key = process.env.CLIENT_ANALYSIS_SUPABASE_SERVICE_KEY;

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
    for (const key of Object.keys(grouped)) {
      const hidden = HIDDEN_PROPERTIES[key];
      if (hidden) grouped[key] = grouped[key].filter((p) => !hidden.includes(p));
      grouped[key].sort();
    }

    return NextResponse.json({ properties: grouped });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
