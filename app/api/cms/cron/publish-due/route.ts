import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDueApprovedEntries } from "@/lib/cmsSupabase";
import { publishEntry } from "@/lib/publishEntry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const hashPrefix = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 8);

// GET /api/cms/cron/publish-due — runs on a schedule (see vercel.json).
// Catches Instagram posts whose scheduled time has arrived (Instagram has no native
// scheduling, so this is the only thing that actually fires them) and retries any
// Facebook submissions that failed earlier.
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const secret = process.env.CRON_SECRET ?? null;
    const expected = secret ? `Bearer ${secret}` : null;
    // Some cron schedulers (confirmed: cron-job.org) strip the "Bearer " prefix from a
    // custom Authorization header value before sending it, even when you type the full
    // "Bearer <token>" string in — so we accept either form rather than fight that.
    const authOk = !secret || authHeader === expected || authHeader === secret;
    if (!authOk && expected) {
      // Diagnostic-only fields — one-way hash prefixes and lengths, never the actual
      // secret — so we can tell a caller (e.g. cron-job.org's response viewer) exactly
      // what's mismatching (whitespace, missing "Bearer ", wrong value entirely) without
      // ever exposing CRON_SECRET itself.
      return NextResponse.json({
        error: "Unauthorized",
        diagnostic: {
          headerPresent: authHeader != null,
          receivedLength: authHeader?.length ?? null,
          expectedLength: expected.length,
          startsWithBearer: authHeader?.startsWith("Bearer ") ?? false,
          trimmedMatches: authHeader?.trim() === expected,
          receivedHashPrefix: authHeader ? hashPrefix(authHeader) : null,
          expectedHashPrefix: hashPrefix(expected),
        },
      }, { status: 401 });
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
