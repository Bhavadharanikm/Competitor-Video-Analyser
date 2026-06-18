import { NextRequest, NextResponse } from "next/server";

const WEBHOOK = "https://n8n.srv1597665.hstgr.cloud/webhook/Videoediting";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(WEBHOOK, {
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
