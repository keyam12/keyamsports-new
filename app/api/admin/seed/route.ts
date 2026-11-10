// POST /api/admin/seed — one-time: copy data/sample.json articles into
// Supabase (admin cookie required). Run after the table is created.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isAdmin, isTrustedOrigin } from "../../../../lib/adminAuth";
import { seedFromSample } from "../../../../lib/articles";

export async function POST(req: Request) {
  if (!isAdmin(req) || !isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Sample seeding is disabled in production." }, { status: 403 });
  try {
    const count = await seedFromSample();
    return NextResponse.json({ ok: true, seeded: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
