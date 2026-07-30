import { NextRequest, NextResponse } from "next/server";

// The "client" webhook now responds immediately (n8n keeps working in the background and
// the frontend tracks progress via Reel_Jobs polling), so it needs almost no time here.
// The "competitor" webhook is still fully synchronous: it converts the clip to MP3 via
// CloudConvert and runs two sequential fal.ai/Gemini passes, with ~28s of hard-coded Wait
// nodes before any polling. That lands around 55-75s, so a 60s cap failed it at random.
export const maxDuration = 300;

const WEBHOOKS: Record<string, string> = {
  competitor: "https://n8n.srv1597665.hstgr.cloud/webhook/instagram-analyser",
  client:     "https://n8n.srv1597665.hstgr.cloud/webhook/Client_Analyser",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const webhook = WEBHOOKS[body.type as string] ?? WEBHOOKS.competitor;

    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { output: text };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
