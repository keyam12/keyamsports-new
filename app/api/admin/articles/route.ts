// /api/admin/articles — admin CRUD (password cookie required).
// GET: list all articles (drafts + published) + { configured } flag.
// POST: create { category, title, summary, date?, ai?, status? }.
// PUT: update { id, ...patch } (e.g. { id, status: "published" }).
// DELETE: { id }.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/adminAuth";
import {
  getAllArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  isSupabaseConfigured,
} from "../../../../lib/articles";

function unauthorized() {
  return NextResponse.json({ error: "Not authorized." }, { status: 401 });
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const articles = await getAllArticles();
    return NextResponse.json({ configured: isSupabaseConfigured(), articles });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const body = await req.json();
    const article = await createArticle({
      category: body.category,
      title: body.title,
      summary: body.summary || "",
      date: body.date || new Date().toISOString().slice(0, 10),
      ai: body.ai !== false,
      status: body.status === "published" ? "published" : "draft",
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const body = await req.json();
    const { id, ...patch } = body;
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    const article = await updateArticle(id, patch);
    return NextResponse.json({ article });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
    await deleteArticle(body.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
