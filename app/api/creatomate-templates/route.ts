import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TemplateRow {
  template_id: string;
  template_name: string;
  thumbnail_url: string | null;
  video_element_name: string | null;
  text_element_name: string | null;
  // Optional secondary text element (e.g. a subtitle) — most templates only have one.
  text_element_2_name: string | null;
  updated_at: string;
}

/**
 * Templates belonging to the separate Creatomate account used only by the
 * Automation → Testing section. Listed explicitly rather than looked up from
 * Creatomate, because that account's API key lives in n8n, not here — a live
 * lookup would work locally and silently no-op in production.
 *
 * Anything listed here shows ONLY under Testing; everything else shows under
 * One Template and Multiple Templates. Add a row here when a new template is
 * added to the Testing account.
 */
const TESTING_TEMPLATE_IDS = new Set([
  "40e91856-ed1f-4002-96bd-ace68ce27f25", // Blank template
  "a0124e1f-83f4-4789-accd-419447743a85", // Gradient overlay
  "e0104502-e42a-4fff-b4a6-dccf543261f4", // Storytelling Video
]);

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
    }

    const params = new URLSearchParams({
      select: "template_name,template_id,thumbnail_url,video_element_name,text_element_name,text_element_2_name,updated_at",
      order: "updated_at.desc",
    });

    const table = encodeURIComponent("Video Template List");
    const res = await fetch(`${url}/rest/v1/${table}?${params.toString()}`, {
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Supabase error ${res.status}: ${text}` }, { status: 500 });
    }

    const rows: TemplateRow[] = await res.json();
    const isTesting = (r: TemplateRow) => TESTING_TEMPLATE_IDS.has(r.template_id);

    return NextResponse.json({
      templates:        rows.filter(r => !isTesting(r)),
      testingTemplates: rows.filter(isTesting),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
