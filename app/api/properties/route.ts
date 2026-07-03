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
    .from("Client_Video_Analysis")
    .select("Property_Tag")
    .eq("Client_Slug", client)
    .not("Property_Tag", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unique = [...new Set((data ?? []).map((r) => r.Property_Tag as string).filter(Boolean))].sort();
  return NextResponse.json({ properties: unique });
}
