import { NextRequest, NextResponse } from "next/server";

const WEBHOOKS: Record<string, string> = {
  competitor: "https://n8n.srv1597665.hstgr.cloud/webhook/instagram-analyser",
  client:     "https://n8n.srv1597665.hstgr.cloud/webhook/Instagram_Analyser",
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
