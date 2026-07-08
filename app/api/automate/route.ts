import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_ONE_TEMPLATE       = "https://n8n.srv1597665.hstgr.cloud/webhook/Multiple-client";
const WEBHOOK_MULTIPLE_TEMPLATES = "https://n8n.srv1597665.hstgr.cloud/webhook/Videoediting";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = new URLSearchParams();

    // Always pass run_id through as a top-level param so n8n can stamp each Reel_Jobs row
    if (body.run_id) params.set("run_id", String(body.run_id));

    for (const [key, val] of Object.entries(body)) {
      if (key === "run_id") continue; // already set above
      if (key === "templates" && Array.isArray(val)) {
        // Split into template1, template2, ...
        (val as object[]).forEach((item, i) => {
          params.set(`template${i + 1}`, JSON.stringify(item));
        });
      } else if (key === "clients" && Array.isArray(val)) {
        // Split into client1, client2, ...
        (val as object[]).forEach((item, i) => {
          params.set(`client${i + 1}`, JSON.stringify(item));
        });
      } else if (key === "template" && val && typeof val === "object") {
        params.set("template", JSON.stringify(val));
      } else {
        params.set(key, typeof val === "object" ? JSON.stringify(val) : String(val ?? ""));
      }
    }

    const webhook = body.mode === "one_template" ? WEBHOOK_ONE_TEMPLATE : WEBHOOK_MULTIPLE_TEMPLATES;
    const res = await fetch(`${webhook}?${params.toString()}`, { method: "GET" });

    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { output: text }; }

    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
