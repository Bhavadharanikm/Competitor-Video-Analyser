import { NextRequest, NextResponse } from "next/server";
import { getDueApprovedEntries } from "@/lib/cmsSupabase";
import { publishEntry } from "@/lib/publishEntry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cms/cron/publish-due — runs on a schedule (see vercel.json).
// Catches Instagram posts whose scheduled time has arrived (Instagram has no native
// scheduling, so this is the only thing that actually fires them) and retries any
// Facebook submissions that failed earlier.
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const due = await getDueApprovedEntries(new Date().toISOString());
    const results = [];
    for (const entry of due) {
      try {
        const updated = await publishEntry(entry);
        results.push({ id: entry.id, status: updated.status });
      } catch (err) {
        results.push({ id: entry.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return NextResponse.json({ checked: due.length, results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
