import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET /api/properties — returns all properties grouped by client
// { "FLOHOM": ["FLO15", "FLO16", ...], "Awayframes": [...] }
export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("Client_Video_Analysis")
    .select("Client_Slug, Property_Tag")
    .not("Property_Tag", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const client = row.Client_Slug as string;
    const tag = row.Property_Tag as string;
    if (!client || !tag) continue;
    if (!grouped[client]) grouped[client] = [];
    if (!grouped[client].includes(tag)) grouped[client].push(tag);
  }
  for (const key of Object.keys(grouped)) grouped[key].sort();

  return NextResponse.json({ properties: grouped });
}
