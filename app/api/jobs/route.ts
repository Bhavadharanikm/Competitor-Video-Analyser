import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const runId = req.nextUrl.searchParams.get("runId");
    if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: `Supabase env vars missing (url=${!!url}, key=${!!key})` }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("Reel_Jobs")
      .select("id, client_slug, property_tag, file_name, status, message, video_url, updated_at")
      .eq("run_id", runId)
      .order("updated_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ jobs: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
