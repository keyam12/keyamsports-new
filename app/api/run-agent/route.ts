
import { NextResponse } from "next/server";
import { generateHeadline } from "../../../agents/MainAgent";

export async function GET() {
  try {
    const out = await generateHeadline("soccer", "A late goal decides the match");
    return NextResponse.json({ ok: true, text: out });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
