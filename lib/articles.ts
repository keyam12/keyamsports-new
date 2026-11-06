// Articles data layer — the heart of "publish without code push".
// Published articles live in Supabase (table `articles`) when configured;
// otherwise the site reads data/sample.json (the pre-Supabase fallback).
// The admin panel writes ONLY to Supabase — on Vercel the filesystem is
// ephemeral, so writing sample.json at runtime would not persist.
import { supabaseAnon, supabaseAdmin, isSupabaseConfigured } from "./supabase";
import sample from "../data/sample.json";

export type ArticleStatus = "draft" | "published";

export interface Article {
  id: string;
  category: string;
  title: string;
  summary: string;
  date: string;
  ai: boolean;
  status: ArticleStatus;
  created_at?: string;
}

const CATEGORIES = ["basketball", "football", "baseball", "soccer"];

function fromSample(): Article[] {
  return (sample.articles as any[]).map((a, i) => ({
    id: `sample-${i}`,
    category: String(a.category),
    title: String(a.title),
    summary: String(a.summary),
    date: String(a.date),
    ai: !!a.ai,
    status: "published" as ArticleStatus,
  }));
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
    created_at: String(r.created_at || ""),
  };
}

/** Public read: published articles, newest first. Falls back to sample.json. */
export async function getPublishedArticles(): Promise<Article[]> {
  const client = supabaseAnon();
  if (!client) return fromSample();
  try {
    const { data, error } = await client
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("date", { ascending: false });
    if (error || !data) {
      console.error("[articles] Supabase read failed, using sample.json:", error?.message);
      return fromSample();
    }
    return data.map(fromRow);
  } catch (err) {
    console.error("[articles] Supabase read failed, using sample.json:", err);
    return fromSample();
  }
}

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
  if (!CATEGORIES.includes(a.category)) throw new Error(`Unknown category: ${a.category}`);
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
  const rows = fromSample().map(({ id, created_at, ...rest }) => rest);
  const { error } = await client.from("articles").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export { isSupabaseConfigured };
