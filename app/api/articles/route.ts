// GET /api/articles — public list of published articles (Supabase, or
// data/sample.json fallback). Used by the home page.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPublishedArticles } from "../../../lib/articles";

export async function GET() {
  const articles = await getPublishedArticles();
  return NextResponse.json({ articles });
}
