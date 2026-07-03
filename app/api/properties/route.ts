import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// GET /api/properties?client=FLOHOM
export async function GET(req: NextRequest) {
  const client = req.nextUrl.searchParams.get("client");
  if (!client) return NextResponse.json({ error: "Missing client" }, { status: 400 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("client_properties")
    .select("property_tag")
    .eq("client_slug", client)
    .order("property_tag");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ properties: data.map((r) => r.property_tag) });
}

// POST /api/properties — add a new property tag
export async function POST(req: NextRequest) {
  const { client, property } = await req.json();
  if (!client || !property) return NextResponse.json({ error: "Missing client or property" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from("client_properties")
    .insert({ client_slug: client, property_tag: property });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
