import { NextRequest, NextResponse } from "next/server";

// n8n's analysis workflow blocks this request until it fully finishes, which can take
// well past Vercel's default 10s serverless timeout — hence FUNCTION_INVOCATION_TIMEOUT.
// 60s is the max allowed on the Hobby plan; if analyses routinely run longer than that,
// this needs to become fire-and-forget with the frontend relying solely on its existing
// Reel_Jobs polling instead of this response.
export const maxDuration = 60;

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
