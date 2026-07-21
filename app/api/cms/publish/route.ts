import { NextRequest, NextResponse } from "next/server";
import { getCalendarEntry } from "@/lib/cmsSupabase";
import { publishEntry } from "@/lib/publishEntry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/cms/publish — body: { id }
// Called when an entry's status is set to "approved". Facebook is submitted to Meta's own
// scheduler immediately; Instagram only actually publishes here if scheduled_at has already
// passed — otherwise the cron sweep (/api/cms/cron/publish-due) picks it up later.
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const entry = await getCalendarEntry(id);
    const updated = await publishEntry(entry);
    return NextResponse.json({ entry: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
