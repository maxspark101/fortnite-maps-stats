import type {
  EpicIsland,
  EpicIslandsResponse,
  EpicIslandMetrics,
  Island,
  SortOption,
  MetricWindow,
} from "./types";

const EPIC_BASE = "https://api.fortnite.com/ecosystem/v1";

// ── Epic Ecosystem API ─────────────────────────────────────────

export async function fetchIslandsPage(after?: string): Promise<EpicIslandsResponse> {
  const url = new URL(`${EPIC_BASE}/islands`);
  url.searchParams.set("size", "100");
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Epic API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchAllIslands(maxPages = 50): Promise<EpicIsland[]> {
  const all: EpicIsland[] = [];
  let after: string | undefined;
  let page = 0;

  do {
    const data = await fetchIslandsPage(after);
    all.push(...data.data);
    // API uses "after" param — cursor is in meta.page.nextCursor
    after = data.meta?.page?.nextCursor ?? undefined;
    page++;
  } while (after && page < maxPages);

  return all;
}

export async function fetchIslandMetrics(
  code: string,
  window: MetricWindow = "last24Hours"
): Promise<EpicIslandMetrics> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      `${EPIC_BASE}/islands/${encodeURIComponent(code)}/metrics?window=${window}`,
      { next: { revalidate: 0 } }
    );
    if (res.status === 429) {
      // Rate limited — wait and retry with exponential backoff
      await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Metrics API ${res.status} for ${code}`);
    return res.json();
  }
  throw new Error(`Metrics API rate limited for ${code}`);
}

// ── Supabase read helpers (used by pages) ──────────────────────

export async function getPopularIslands(
  sort: SortOption = "current_ccu",
  limit = 50,
  offset = 0,
  tag?: string
): Promise<Island[]> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();

  // Query islands table directly — all sort columns live there, no expensive JOIN needed
  const ascending = sort === "discovery_rank";

  let query = supabase
    .from("islands")
    .select("code,title,creator_code,created_in,tags,category,image_url,current_ccu,discovery_rank,peak_ccu,plays,favorites")
    .order(sort, { ascending, nullsFirst: false });

  if (tag) query = query.contains("tags", [tag]);

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  // Fill in null metric fields to satisfy Island type
  return (data ?? []).map((r) => ({
    ...r,
    unique_players: null,
    minutes_played: null,
    avg_minutes_per_player: null,
    recommendations: null,
    retention_d1: null,
    retention_d7: null,
    metrics_at: null,
    metrics_fetched_at: null,
  })) as Island[];
}

export async function countIslands(tag?: string): Promise<number> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();

  let query = supabase.from("islands").select("*", { count: "exact", head: true });
  if (tag) query = query.contains("tags", [tag]);

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function getAllTags(): Promise<string[]> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc("get_all_tags");
  if (error || !data) return [];
  return data as string[];
}

export async function getIslandByCode(code: string): Promise<Island | null> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("popular_islands")
    .select("*")
    .eq("code", code)
    .single();

  if (error) return null;
  return data as Island;
}

export async function getIslandMetricsHistory(code: string, limit = 144): Promise<import("./types").IslandMetricSnapshot[]> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("island_metrics")
    .select("island_code, recorded_at, peak_ccu, unique_players, plays, favorites, recommendations, avg_minutes_per_player, retention_d1, retention_d7")
    .eq("island_code", code)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as import("./types").IslandMetricSnapshot[];
}

export async function searchIslands(query: string, limit = 50): Promise<Island[]> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("popular_islands")
    .select("*")
    .or(`title.ilike.%${query}%,creator_code.ilike.%${query}%,code.eq.${query}`)
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Island[];
}

// ── Helpers ────────────────────────────────────────────────────
function toIsland(r: Record<string, unknown>): Island {
  return {
    ...r,
    unique_players: null,
    minutes_played: null,
    avg_minutes_per_player: null,
    recommendations: null,
    retention_d1: null,
    retention_d7: null,
    metrics_at: null,
  } as Island;
}

// ── Creator queries ────────────────────────────────────────────

export async function getCreatorIslands(
  creatorCode: string,
  sort: SortOption = "current_ccu",
  limit = 48,
  offset = 0
): Promise<Island[]> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const ascending = sort === "discovery_rank";
  const { data, error } = await supabase
    .from("islands")
    .select("code,title,creator_code,created_in,tags,category,image_url,current_ccu,discovery_rank,peak_ccu,plays,favorites")
    .eq("creator_code", creatorCode)
    .order(sort, { ascending, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return (data ?? []).map(toIsland);
}

export async function getCreatorStats(creatorCode: string): Promise<{
  totalMaps: number;
  totalPlayers: number;
  totalPlays: number;
  totalFavorites: number;
  topMap: Island | null;
}> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { data } = await supabase
    .from("islands")
    .select("code,title,creator_code,tags,image_url,current_ccu,peak_ccu,plays,favorites,created_in,category")
    .eq("creator_code", creatorCode);
  const rows = (data ?? []) as Record<string, unknown>[];
  const totalMaps     = rows.length;
  const totalPlayers  = rows.reduce((s, r) => s + ((r.current_ccu as number) ?? 0), 0);
  const totalPlays    = rows.reduce((s, r) => s + ((r.plays as number) ?? 0), 0);
  const totalFavorites= rows.reduce((s, r) => s + ((r.favorites as number) ?? 0), 0);
  const sorted        = [...rows].sort((a, b) => ((b.current_ccu as number) ?? 0) - ((a.current_ccu as number) ?? 0));
  const topMap        = sorted[0] ? toIsland(sorted[0]) : null;
  return { totalMaps, totalPlayers, totalPlays, totalFavorites, topMap };
}

export async function countCreatorIslands(creatorCode: string): Promise<number> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { count } = await supabase
    .from("islands")
    .select("*", { count: "exact", head: true })
    .eq("creator_code", creatorCode);
  return count ?? 0;
}

// ── Tag queries ────────────────────────────────────────────────

export async function getTagsWithStats(): Promise<Array<{ tag: string; map_count: number; total_players: number }>> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("get_tag_stats");
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ tag: string; map_count: number; total_players: number }>;
}

// ── Related maps ───────────────────────────────────────────────

export async function getRelatedMaps(code: string, tags: string[], limit = 6): Promise<Island[]> {
  if (!tags?.length) return [];
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { data } = await supabase
    .from("islands")
    .select("code,title,creator_code,created_in,tags,category,image_url,current_ccu,peak_ccu,plays,favorites")
    .neq("code", code)
    .overlaps("tags", tags)
    .order("current_ccu", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []).map(toIsland);
}

// ── Platform stats ─────────────────────────────────────────────

export async function getPlatformStats(): Promise<{
  total_maps: number; active_maps: number;
  total_players: number; total_plays: number; total_favorites: number;
}> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("get_platform_stats");
  if (error) throw new Error(error.message);
  const row = (data as Record<string, number>[])?.[0] ?? {};
  return {
    total_maps:      Number(row.total_maps      ?? 0),
    active_maps:     Number(row.active_maps     ?? 0),
    total_players:   Number(row.total_players   ?? 0),
    total_plays:     Number(row.total_plays     ?? 0),
    total_favorites: Number(row.total_favorites ?? 0),
  };
}

export async function getNewestMaps(limit = 24): Promise<Island[]> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { data } = await supabase
    .from("islands")
    .select("code,title,creator_code,created_in,tags,category,image_url,current_ccu,peak_ccu,plays,favorites")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(toIsland);
}

// ── Keywords ───────────────────────────────────────────────────

export async function getTopKeywords(limit = 5000): Promise<Array<{ keyword: string; count: number }>> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("keyword_stats")
    .select("keyword, map_count")
    .order("map_count", { ascending: false })
    .limit(limit);
  if (error || !data?.length) return [];
  return data.map(r => ({ keyword: r.keyword, count: r.map_count }));
}

export async function getKeywordsUpdatedAt(): Promise<string | null> {
  const { createServerClient } = await import("./supabase/server");
  const supabase = createServerClient();
  const { data } = await supabase
    .from("keyword_stats")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  return (data as { updated_at: string } | null)?.updated_at ?? null;
}
