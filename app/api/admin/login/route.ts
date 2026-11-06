// POST /api/admin/login — { password } → sets the admin cookie.
// Returns 401 on a wrong password, 500 when ADMIN_PASSWORD is not set.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { adminToken, adminCookieHeader } from "../../../../lib/adminAuth";

export async function POST(req: Request) {
  const token = adminToken();
  if (!token) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set on the server." },
      { status: 500 }
    );
  }
  let password = "";
  try {
    password = (await req.json()).password || "";
  } catch {
    password = "";
  }
  if (createHash("sha256").update(password).digest("hex") !== token) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", adminCookieHeader());
  return res;
}
