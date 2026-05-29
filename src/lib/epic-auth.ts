import crossFetch from "cross-fetch";
import { fetchImageUrlFromEpic } from "./epic-oauth";

const FGG_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  Accept: "text/html,application/xhtml+xml",
};

function extractImageFromHtml(html: string): string | null {
  const thumb = html.match(/island-img-thumb[^>]+src='([^']+)'/);
  if (thumb) return thumb[1];

  const qstv = html.match(
    /https:\/\/cdn-\d+\.qstv\.on\.epicgames\.com\/[A-Za-z0-9]+\/image\/landscape_comp[^"'\s<>]*/
  );
  if (qstv) return qstv[0];

  const ue = html.match(/https:\/\/cdn2\.unrealengine\.com\/[^"'\s<>]+\.(jpg|jpeg|png|webp)/);
  if (ue) return ue[0];

  const og = html.match(/property=['"]og:image['"]\s+content=['"]([^'"]+)['"]/);
  if (og) return og[1];

  return null;
}

// Fetches live player count, image URL, and release date in a single HTTP request.
export async function fetchIslandPageData(code: string): Promise<{
  playerCount: number | null;
  imageUrl: string | null;
  releasedAt: string | null;
}> {
  try {
    const res = await crossFetch(`https://fortnite.gg/island/${encodeURIComponent(code)}`, {
      headers: FGG_HEADERS,
    });
    if (!res.ok) return { playerCount: null, imageUrl: null, releasedAt: null };
    const html = await res.text();
    const m = html.match(/js-players-now[^>]*data-n='(\d+)'/);
    const dateMatch = html.match(/<time[^>]*datetime='([^']+)'/);
    return {
      playerCount: m ? parseInt(m[1], 10) : null,
      imageUrl: extractImageFromHtml(html),
      releasedAt: dateMatch ? dateMatch[1] : null,
    };
  } catch {
    return { playerCount: null, imageUrl: null, releasedAt: null };
  }
}

export async function fetchLivePlayerCount(code: string): Promise<number | null> {
  const { playerCount } = await fetchIslandPageData(code);
  return playerCount;
}

export async function fetchIslandImageUrl(code: string): Promise<string | null> {
  // Try Epic's official Links Service first (no scraping, no rate limit risk)
  const epicUrl = await fetchImageUrlFromEpic(code);
  if (epicUrl) return epicUrl;
  // Fall back to fortnite.gg scraping if Epic API is unavailable
  const { imageUrl } = await fetchIslandPageData(code);
  return imageUrl;
}
