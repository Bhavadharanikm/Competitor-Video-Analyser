import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return { url, key };
}

async function countRows(url: string, key: string, params: URLSearchParams) {
  params.set("select", "id");
  const res = await fetch(`${url}/rest/v1/CMS_Content_Calendar?${params.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  const range = res.headers.get("content-range"); // e.g. "0-9/27"
  return range ? Number(range.split("/")[1] ?? 0) : (await res.json()).length;
}

// Agency-wide counts across every client, shown on the Dashboard/Analytics stat cards.
export async function GET() {
  try {
    const { url, key } = getEnv();
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [scheduled, needsApproval, published] = await Promise.all([
      countRows(url, key, new URLSearchParams({ and: `(status.eq.approved,scheduled_at.gte.${now.toISOString()},scheduled_at.lte.${in7.toISOString()})` })),
      countRows(url, key, new URLSearchParams({ status: "eq.in_review" })),
      countRows(url, key, new URLSearchParams({ and: `(status.eq.sent,updated_at.gte.${ago7.toISOString()})` })),
    ]);

    return NextResponse.json({ scheduled, needsApproval, published });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
