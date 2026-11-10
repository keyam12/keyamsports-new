import type { Article } from "./articles";
export class ArticleInputError extends Error {}
const categories = ["basketball", "football", "baseball", "soccer"];
const fields = new Set(["category", "title", "summary", "date", "ai", "status", "sources"]);

export function isSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

export function validateArticleInput(value: unknown, partial = false): Partial<Article> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ArticleInputError("Expected an article object.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !fields.has(key))) throw new ArticleInputError("Unknown article field.");
  if (Object.keys(input).length === 0) throw new ArticleInputError("Empty article update.");
  const patch: Partial<Article> = {};
  for (const key of ["title", "summary", "category", "date"] as const) {
    if (!(key in input)) continue;
    if (typeof input[key] !== "string") throw new ArticleInputError(`Invalid ${key}.`);
    const text = (input[key] as string).trim();
    const max = key === "summary" ? 20_000 : key === "title" ? 250 : 40;
    if (!text || text.length > max) throw new ArticleInputError(`Invalid ${key} length.`);
    patch[key] = text;
  }
  if (patch.category && !categories.includes(patch.category)) throw new ArticleInputError("Unknown category.");
  if (patch.date && (!/^\d{4}-\d{2}-\d{2}$/.test(patch.date) ||
      !Number.isFinite(Date.parse(patch.date)) || new Date(patch.date).toISOString().slice(0, 10) !== patch.date ||
      patch.date > new Date().toISOString().slice(0, 10))) throw new ArticleInputError("Invalid publication date.");
  if ("ai" in input) {
    if (typeof input.ai !== "boolean") throw new ArticleInputError("Invalid AI disclosure flag.");
    patch.ai = input.ai;
  }
  if ("status" in input) {
    if (input.status !== "draft" && input.status !== "published") throw new ArticleInputError("Invalid publication status.");
    patch.status = input.status;
  }
  if ("sources" in input) {
    if (!Array.isArray(input.sources) || input.sources.length > 20 || !input.sources.every(isSourceUrl)) {
      throw new ArticleInputError("Sources must be a list of up to 20 HTTPS URLs.");
    }
    patch.sources = [...new Set(input.sources as string[])];
  }
  if (!partial && (!patch.title || !patch.summary || !patch.category)) throw new ArticleInputError("Headline, summary and category are required.");
  return patch;
}

export function validatePublication(article: Partial<Article>) {
  if (article.status !== "published") return;
  validateArticleInput({ title: article.title, summary: article.summary, category: article.category, date: article.date });
  if (!article.sources?.length || !article.sources.every(isSourceUrl)) throw new ArticleInputError("Publishing requires source URLs and human verification of the story.");
}
