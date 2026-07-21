import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return { url, key };
}

// GET /api/cms/clients — reads the client list from our own database ("CMS_Clients").
// Never calls Meta directly — use POST /api/cms/clients/sync to refresh it from Meta.
export async function GET() {
  try {
    const { url, key } = getEnv();
    const params = new URLSearchParams({ select: "page_id,name,instagram_account_id", order: "name.asc" });
    const res = await fetch(`${url}/rest/v1/CMS_Clients?${params.toString()}`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    const clients = await res.json();
    return NextResponse.json({ clients });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
