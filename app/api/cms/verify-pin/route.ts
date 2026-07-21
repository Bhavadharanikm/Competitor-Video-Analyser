import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();
    const correctPin = process.env.CMS_PIN;

    if (!correctPin) {
      return NextResponse.json({ error: "CMS_PIN not configured" }, { status: 500 });
    }

    const ok = typeof pin === "string" && pin === correctPin;
    return NextResponse.json({ ok });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
