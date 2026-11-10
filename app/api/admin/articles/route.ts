export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isAdmin, isTrustedOrigin } from "../../../../lib/adminAuth";
import { getAllArticles, createArticle, updateArticle, deleteArticle, isSupabaseConfigured } from "../../../../lib/articles";
import { ArticleInputError, validateArticleInput } from "../../../../lib/articleValidation";

function denied(req: Request) {
  return !isAdmin(req) || !isTrustedOrigin(req)
    ? NextResponse.json({ error: "Not authorized." }, { status: 401 }) : null;
}
function failure(error: unknown) {
  if (error instanceof ArticleInputError) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error("[admin/articles] Request failed", error);
  return NextResponse.json({ error: "Article operation failed. Check server configuration and logs." }, { status: 500 });
}
async function body(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > 65_536) throw new ArticleInputError("Request is too large.");
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new ArticleInputError("Invalid JSON object."); }
}
function articleId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ArticleInputError("Invalid article id.");
  }
  return value;
}
export async function GET(req: Request) {
  const rejection = denied(req); if (rejection) return rejection;
  try { return NextResponse.json({ configured: isSupabaseConfigured(), articles: await getAllArticles() }); }
  catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  const rejection = denied(req); if (rejection) return rejection;
  try {
    const input = validateArticleInput(await body(req));
    const article = await createArticle({
      category: input.category!, title: input.title!, summary: input.summary!,
      date: input.date || new Date().toISOString().slice(0, 10), ai: input.ai !== false,
      status: input.status || "draft", sources: input.sources || [],
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) { return failure(error); }
}
export async function PUT(req: Request) {
  const rejection = denied(req); if (rejection) return rejection;
  try {
    const { id, ...input } = await body(req);
    const article = await updateArticle(articleId(id), validateArticleInput(input, true));
    return NextResponse.json({ article });
  } catch (error) { return failure(error); }
}
export async function DELETE(req: Request) {
  const rejection = denied(req); if (rejection) return rejection;
  try {
    const input = await body(req);
    if (Object.keys(input).some((key) => key !== "id")) throw new ArticleInputError("Unknown delete field.");
    await deleteArticle(articleId(input.id));
    return NextResponse.json({ ok: true });
  } catch (error) { return failure(error); }
}
