import type { CalendarEntry } from "./meta";

const TABLE = encodeURIComponent("CMS_Content_Calendar");

function getEnv() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return { url, key };
}

function headers(key: string) {
  return { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function getCalendarEntry(id: string): Promise<CalendarEntry> {
  const { url, key } = getEnv();
  const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${id}&select=*`, { headers: headers(key), cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  if (!rows[0]) throw new Error("Entry not found");
  return rows[0] as CalendarEntry;
}

export async function getDueApprovedEntries(nowIso: string): Promise<CalendarEntry[]> {
  const { url, key } = getEnv();
  const params = new URLSearchParams({
    select: "*",
    status: "eq.approved",
    scheduled_at: `lte.${nowIso}`,
  });
  const res = await fetch(`${url}/rest/v1/${TABLE}?${params.toString()}`, { headers: headers(key), cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  const rows: CalendarEntry[] = await res.json();
  return rows.filter(r => {
    const needsFb = r.platform === "both" || r.platform === "facebook";
    const needsIg = r.platform === "both" || r.platform === "instagram";
    return (needsFb && !r.fb_published) || (needsIg && !r.ig_published);
  });
}

export async function patchCalendarEntry(id: string, patch: Record<string, unknown>) {
  const { url, key } = getEnv();
  const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers(key), Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0];
}
