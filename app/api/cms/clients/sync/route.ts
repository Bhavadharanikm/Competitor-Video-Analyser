import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MetaPage {
  id: string;
  name: string;
  instagram_business_account?: { id: string };
}

function supabaseHeaders(key: string) {
  return { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
}

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return { url, key };
}

// POST /api/cms/clients/sync — the ONLY place that calls Meta's API for client info.
// Pulls every Page (+ linked Instagram account) the system user has been assigned and
// upserts them into our own "CMS_Clients" table. Everything else in the app reads from
// that table, never from Meta directly, so the system token is only ever used here.
export async function POST() {
  try {
    const token = process.env.META_SYSTEM_USER_TOKEN;
    if (!token) return NextResponse.json({ error: "META_SYSTEM_USER_TOKEN not configured" }, { status: 500 });

    const clients: { page_id: string; name: string; instagram_account_id: string | null }[] = [];
    let url: string | null =
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&limit=100&access_token=${token}`;

    while (url) {
      const res: Response = await fetch(url);
      const data: { data?: MetaPage[]; paging?: { next?: string }; error?: { message?: string } } = await res.json();
      if (!res.ok) {
        return NextResponse.json({ error: data.error?.message ?? "Meta API error" }, { status: 500 });
      }
      for (const page of (data.data ?? []) as MetaPage[]) {
        clients.push({
          page_id: page.id,
          name: page.name,
          instagram_account_id: page.instagram_business_account?.id ?? null,
        });
      }
      url = data.paging?.next ?? null;
    }

    const { url: supaUrl, key } = getEnv();
    const rows = clients.map(c => ({ ...c, updated_at: new Date().toISOString() }));
    const res = await fetch(`${supaUrl}/rest/v1/CMS_Clients?on_conflict=page_id`, {
      method: "POST",
      headers: { ...supabaseHeaders(key), Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(rows),
    });
    if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });
    const saved = await res.json();

    return NextResponse.json({ synced: saved.length, clients: saved });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
