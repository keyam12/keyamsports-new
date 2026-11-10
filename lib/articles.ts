import { validateArticleInput, validatePublication, isSourceUrl } from "./articleValidation";
import { cache } from "react";
// Articles data layer — the heart of "publish without code push".
// Published articles live in Supabase (table `articles`) when configured;
// Existing editorial publications are retained in data/published.json.
// The original seed examples remain development-only.
// The admin panel writes ONLY to Supabase — on Vercel the filesystem is
// ephemeral, so writing sample.json at runtime would not persist.
import { supabaseAnon, supabaseAdmin, isSupabaseConfigured } from "./supabase";
import sample from "../data/sample.json";
import published from "../data/published.json";

export type ArticleStatus = "draft" | "published";

export interface Article {
  id: string;
  category: string;
  title: string;
  summary: string;
  date: string;
  ai: boolean;
  status: ArticleStatus;
  sources?: string[];
  created_at?: string;
}

/** Keep the original article IDs, dates, copy and source attribution. */
export function getRepositoryPublications(): Article[] {
  return published.articles.map((a) => ({
    ...a,
    status: "published" as ArticleStatus,
    sources: "sources" in a && Array.isArray(a.sources) ? a.sources.filter(isSourceUrl) : undefined,
  }));
}

function fromSample(): Article[] {
  return (sample.articles as any[]).map((a, i) => ({
    id: `sample-${i}`,
    category: String(a.category),
    title: String(a.title),
    summary: String(a.summary),
    date: String(a.date),
    ai: !!a.ai,
    status: "published" as ArticleStatus,
    sources: Array.isArray(a.sources) ? a.sources.filter(isSourceUrl) : undefined,
  }));
}

function repositoryFallback(): Article[] {
  // After a complete database migration, this explicit mode prevents a database
  // outage from bringing back articles intentionally unpublished by editors.
  if (process.env.KEYAM_CONTENT_SOURCE === "database") return [];
  if (process.env.NODE_ENV === "development" && process.env.KEYAM_ENABLE_SAMPLE_CONTENT === "true") return fromSample();
  return uniqueArticles(getRepositoryPublications()).sort((a, b) => b.date.localeCompare(a.date));
}

function fromRow(r: any): Article {
  return {
    id: String(r.id),
    category: String(r.category),
    title: String(r.title),
    summary: String(r.summary),
    date: String(r.date || r.created_at || "").slice(0, 10),
    ai: !!r.ai,
    status: (r.status as ArticleStatus) || "draft",
    sources: Array.isArray(r.sources) ? r.sources.filter(isSourceUrl) : undefined,
    created_at: String(r.created_at || ""),
  };
}

function uniqueArticles(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const key = article.title.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Database publications when available; preserve existing repository notes otherwise. */
export const getPublishedArticles = cache(async (): Promise<Article[]> => {
  try {
    const client = supabaseAnon();
    if (!client) return repositoryFallback();
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("date", { ascending: false });
    if (error || !data) {
      console.error("[articles] Supabase read failed:", error?.message);
      return repositoryFallback();
    }
    // A successful empty result is authoritative: never undo unpublishing.
    return uniqueArticles(data.map(fromRow));
  } catch (err) {
    console.error("[articles] Supabase read failed:", err);
    return repositoryFallback();
  }
});

/** Admin read: all articles (drafts + published), newest first. */
export async function getAllArticles(): Promise<Article[]> {
  const client = supabaseAdmin();
  if (!client) return [];
  const { data, error } = await client
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) throw new Error(error?.message || "Failed to list articles");
  return data.map(fromRow);
}

export async function createArticle(a: Omit<Article, "id" | "created_at">): Promise<Article> {
  const client = supabaseAdmin();
  if (!client) throw new Error("Supabase is not configured");
  validateArticleInput(a);
  validatePublication(a);
  const { data, error } = await client
    .from("articles")
    .insert({ ...a, date: a.date || new Date().toISOString().slice(0, 10) })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create article");
  return fromRow(data);
}

export async function updateArticle(
  id: string,
  patch: Partial<Omit<Article, "id" | "created_at">>
): Promise<Article> {
  const client = supabaseAdmin();
  if (!client) throw new Error("Supabase is not configured");
  validateArticleInput(patch, true);
  const { data: existing, error: readError } = await client.from("articles").select("*").eq("id", id).single();
  if (readError || !existing) throw new Error("Article not found");
  validatePublication({ ...fromRow(existing), ...patch });
  const { data, error } = await client
    .from("articles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to update article");
  return fromRow(data);
}

export async function deleteArticle(id: string): Promise<void> {
  const client = supabaseAdmin();
  if (!client) throw new Error("Supabase is not configured");
  const { error } = await client.from("articles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Seed the table from data/sample.json (one-time, from the admin panel). */
export async function seedFromSample(): Promise<number> {
  const client = supabaseAdmin();
  if (!client) throw new Error("Supabase is not configured");
  if (process.env.NODE_ENV === "production") throw new Error("Sample seeding is disabled in production");
  const { count, error: countError } = await client.from("articles").select("id", { count: "exact", head: true });
  if (countError) throw new Error("Unable to check existing articles");
  if (count) throw new Error("Only an empty development database can be seeded");
  const rows = fromSample().map(({ id, created_at, ...rest }) => ({ ...rest, status: "draft" }));
  const { error } = await client.from("articles").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export { isSupabaseConfigured };
