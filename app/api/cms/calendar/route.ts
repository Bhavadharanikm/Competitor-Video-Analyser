import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function supabaseHeaders(key: string) {
  return {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}

const TABLE = encodeURIComponent("CMS_Content_Calendar");

// GET /api/cms/calendar?from=ISO&to=ISO — list entries in a date range
export async function GET(req: NextRequest) {
  try {
    const { url, key } = getEnv();
    if (!url || !key) return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const clientPageId = req.nextUrl.searchParams.get("client_page_id");

    const params = new URLSearchParams({
      select: "*",
      order: "scheduled_at.asc",
    });
    if (from) params.set("scheduled_at", `gte.${from}`);
    if (clientPageId) params.set("client_page_id", `eq.${clientPageId}`);

    const res = await fetch(`${url}/rest/v1/${TABLE}?${params.toString()}`, { headers: supabaseHeaders(key), cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    let entries = await res.json();

    if (to) entries = entries.filter((e: { scheduled_at: string }) => e.scheduled_at <= to);

    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// POST /api/cms/calendar — create a new entry
export async function POST(req: NextRequest) {
  try {
    const { url, key } = getEnv();
    if (!url || !key) return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });

    const body = await req.json();
    const res = await fetch(`${url}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { ...supabaseHeaders(key), Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    const created = await res.json();
    return NextResponse.json({ entry: created[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// PATCH /api/cms/calendar?id=UUID — update an entry (e.g. status change)
export async function PATCH(req: NextRequest) {
  try {
    const { url, key } = getEnv();
    if (!url || !key) return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...supabaseHeaders(key), Prefer: "return=representation" },
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    const updated = await res.json();
    return NextResponse.json({ entry: updated[0] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

// DELETE /api/cms/calendar?id=UUID
export async function DELETE(req: NextRequest) {
  try {
    const { url, key } = getEnv();
    if (!url || !key) return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${id}`, { method: "DELETE", headers: supabaseHeaders(key) });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
