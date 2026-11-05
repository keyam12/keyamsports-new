// Free images via Pixabay (no monthly cap, key free, no card).
// Server-side cache (24h) + download-on-server rule: Pixabay asks clients
// to cache and not hotlink permanently. Without PIXABAY_API_KEY the route
// returns an empty list. Unsplash is the secondary source (not wired yet —
// needs its own approval + attribution flow).

const API_BASE = "https://pixabay.com/api";

export interface MediaItem {
  id: number;
  type: "photo" | "video";
  previewURL: string;
  largeURL: string;
  pageURL: string;
  tags: string;
  user: string;
}

interface CacheEntry {
  at: number;
  data: MediaItem[];
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function fetchJson(url: string, timeoutMs = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function getMedia(query: string): Promise<{ items: MediaItem[]; cached: boolean; configured: boolean }> {
  const key = process.env.PIXABAY_API_KEY || "";
  const q = query.trim().toLowerCase();
  if (!q) return { items: [], cached: false, configured: !!key };

  const now = Date.now();
  const hit = cache.get(q);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return { items: hit.data, cached: true, configured: !!key };
  }
  if (!key) return { items: [], cached: false, configured: false };

  try {
    const url = `${API_BASE}/?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&image_type=photo&per_page=8&safesearch=true`;
    const data = await fetchJson(url);
    const items: MediaItem[] = (data?.hits || []).map((h: any) => ({
      id: Number(h.id),
      type: "photo" as const,
      previewURL: String(h.previewURL || ""),
      largeURL: String(h.largeImageURL || h.webformatURL || ""),
      pageURL: String(h.pageURL || ""),
      tags: String(h.tags || ""),
      user: String(h.user || ""),
    }));
    cache.set(q, { at: now, data: items });
    return { items, cached: false, configured: true };
  } catch (err) {
    console.error("[media] fetch failed:", err);
    if (hit) return { items: hit.data, cached: true, configured: true };
    return { items: [], cached: false, configured: true };
  }
}
