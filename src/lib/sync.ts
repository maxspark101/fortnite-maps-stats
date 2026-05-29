import { fetchAllIslands, fetchIslandMetrics } from "./api";
import { fetchIslandImageUrl, fetchIslandPageData } from "./epic-auth";
import { uploadIslandImage, isStorageUrl } from "./image-storage";
import { createServerClient } from "./supabase/server";
import type { EpicIsland, EpicIslandMetrics } from "./types";

function latestValue(points: { value: number | null; timestamp: string }[]): number | null {
  if (!points?.length) return null;
  return [...points].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0]?.value ?? null;
}

// After Epic's API update, last10Minutes returns daily data (timestamps at 00:00:00.000Z)
// instead of real-time granular data. Detect this to avoid overwriting live CCU with stale daily peaks.
function isRealtimeData(points: { value: number | null; timestamp: string }[]): boolean {
  if (!points?.length) return false;
  return points.some(p => !p.timestamp.endsWith("T00:00:00.000Z"));
}

function latestRetention(
  points: { d1: number | null; d7: number | null; timestamp: string }[]
): { d1: number | null; d7: number | null } {
  if (!points?.length) return { d1: null, d7: null };
  const latest = [...points].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
  return { d1: latest?.d1 ?? null, d7: latest?.d7 ?? null };
}

// ── Island metadata sync ───────────────────────────────────────

export async function syncIslands(maxPages = 50): Promise<{ updated: number }> {
  const supabase = createServerClient();
  const islands = await fetchAllIslands(maxPages);
  const now = new Date().toISOString();

  // Deduplicate by code — Epic API can return same code across pages
  // Preserve Epic's return order as discovery_rank (0 = most popular by Epic's algorithm)
  const seen = new Set<string>();
  let rank = 0;
  const rows = islands
    .filter((island: EpicIsland) => {
      if (seen.has(island.code)) return false;
      seen.add(island.code);
      return true;
    })
    .map((island: EpicIsland) => ({
      code: island.code,
      title: island.title,
      creator_code: island.creatorCode ?? null,
      created_in: island.createdIn ?? null,
      tags: island.tags ?? [],
      category: island.category ?? null,
      image_url: null,
      last_synced_at: now,
      discovery_rank: rank++,
    }));

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from("islands")
      .upsert(rows.slice(i, i + CHUNK), { onConflict: "code" });
    if (error) throw new Error(`Island upsert failed: ${error.message}`);
  }

  return { updated: rows.length };
}

// ── Metrics sweep ──────────────────────────────────────────────

export async function syncMetrics(batchSize = 500): Promise<{ processed: number; errors: number }> {
  const supabase = createServerClient();

  // Pick islands that haven't been updated in the last 9 minutes
  // Priority: top-ranked (lowest discovery_rank) first, then oldest-fetched
  const cutoff = new Date(Date.now() - 9 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("islands")
    .select("code")
    .or(`metrics_fetched_at.lt.${cutoff},metrics_fetched_at.is.null`)
    .not("code", "in", `(${PINNED_CODES.map(c => `"${c}"`).join(",")})`)
    .order("discovery_rank", { ascending: true, nullsFirst: false })
    .order("metrics_fetched_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);

  if (error) throw new Error(error.message);
  const regularCodes: string[] = (data ?? []).map((r: { code: string }) => r.code);
  if (!regularCodes.length && !PINNED_CODES.length) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;
  const metricRows: object[] = [];
  const now = new Date().toISOString();
  const ccuMap = new Map<string, number | null>();

  async function fetchAndRecord(code: string) {
    const [metrics10m, metrics24h] = await Promise.all([
      fetchIslandMetrics(code, "last10Minutes"),
      fetchIslandMetrics(code, "last24Hours"),
    ]);
    // Only use last10Minutes CCU if Epic API still returns real-time granular data.
    // After Epic's update, last10Minutes returns daily snapshots — in that case
    // current_ccu is left untouched here and stays owned by syncMetricsTop (fortnite.gg).
    const peakPoints = metrics10m.peakCCU ?? [];
    const currentCcu = isRealtimeData(peakPoints) ? latestValue(peakPoints) : null;
    ccuMap.set(code, currentCcu);
    const retention = latestRetention(metrics24h.retention ?? []);
    metricRows.push({
      island_code: code,
      recorded_at: now,
      peak_ccu:               latestValue(metrics24h.peakCCU ?? []),
      unique_players:         latestValue(metrics24h.uniquePlayers ?? []),
      plays:                  latestValue(metrics24h.plays ?? []),
      minutes_played:         latestValue(metrics24h.minutesPlayed ?? []),
      avg_minutes_per_player: latestValue(metrics24h.averageMinutesPerPlayer ?? []),
      favorites:              latestValue(metrics24h.favorites ?? []),
      recommendations:        latestValue(metrics24h.recommendations ?? []),
      retention_d1: retention.d1,
      retention_d7: retention.d7,
    });
    processed++;
  }

  // Step 1: pinned codes sequentially first — guaranteed to succeed before rate limit
  for (const code of PINNED_CODES) {
    try {
      await fetchAndRecord(code);
      await new Promise(r => setTimeout(r, 150)); // small delay between pinned
    } catch {
      errors++;
    }
  }

  // Step 2: regular codes concurrently
  await Promise.allSettled(
    regularCodes.map(async (code) => {
      try { await fetchAndRecord(code); } catch { errors++; }
    })
  );

  if (metricRows.length > 0) {
    const { error: insertError } = await supabase
      .from("island_metrics")
      .insert(metricRows);
    if (insertError) throw new Error(`Metrics insert failed: ${insertError.message}`);

    // Update denormalized metrics on islands for fast sorting.
    // When Epic API returns real-time data (non-daily), update current_ccu.
    // When Epic returns only daily snapshots, reset current_ccu to 0 so stale
    // values don't pollute the sort — syncMetricsTop (fortnite.gg) owns live CCU.
    await Promise.allSettled(
      metricRows.map((row) => {
        const r = row as Record<string, unknown>;
        const liveCcu = ccuMap.get(r.island_code as string);
        return supabase.from("islands")
          .update({
            current_ccu: liveCcu ?? 0,
            peak_ccu:    r.peak_ccu  ?? null,
            plays:       r.plays     ?? null,
            favorites:   r.favorites ?? null,
          } as object)
          .eq("code", r.island_code as string);
      })
    );
  }

  // Mark all fetched codes as done
  const allCodes = [...PINNED_CODES, ...regularCodes];
  const CHUNK = 500;
  for (let i = 0; i < allCodes.length; i += CHUNK) {
    await supabase
      .from("islands")
      .update({ metrics_fetched_at: now } as object)
      .in("code", allCodes.slice(i, i + CHUNK));
  }

  return { processed, errors };
}

// ── Fast top-maps refresh — runs every 2 min, updates only top N by current_ccu ──

// Epic's own experiences — always synced regardless of their current_ccu
const PINNED_CODES = ["experience_br", "experience_og", "experience_reload", "experience_blitz"];

export async function syncMetricsTop(topN = 50): Promise<{ processed: number; errors: number }> {
  const supabase = createServerClient();

  // Always re-fetch the top N maps regardless of when they were last fetched
  const { data, error } = await supabase
    .from("islands")
    .select("code")
    .order("current_ccu", { ascending: false, nullsFirst: false })
    .limit(topN);


  if (error) throw new Error(error.message);
  const topCodes: string[] = (data ?? []).map((r: { code: string }) => r.code);
  // Merge pinned codes at the front, deduplicate
  const codes: string[] = [
    ...PINNED_CODES,
    ...topCodes.filter(c => !PINNED_CODES.includes(c)),
  ];
  if (!codes.length) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;
  const now = new Date().toISOString();
  const CONCURRENT = 5;

  // Sliding window — max 10 concurrent requests to avoid Epic rate limits
  const active = new Set<Promise<void>>();

  async function fetchOne(code: string) {
    try {
      // Single fortnite.gg request returns both live CCU and image URL
      const { playerCount, imageUrl } = await fetchIslandPageData(code);
      const update: Record<string, unknown> = {
        current_ccu: playerCount ?? 0,
        metrics_fetched_at: now,
      };
      if (imageUrl) {
        // Upload to Supabase Storage so image is served from our own CDN
        const storageUrl = await uploadIslandImage(code, imageUrl);
        update.image_url = storageUrl ?? imageUrl;
        update.image_synced_at = now;
      }
      await supabase.from("islands").update(update as object).eq("code", code);
      processed++;
    } catch {
      errors++;
    }
  }

  // Reset ALL maps to 0 before updating — clears stale values from previous Epic API data.
  // The live updates below will immediately restore correct counts for active maps.
  await supabase.from("islands").update({ current_ccu: 0 } as object).gt("current_ccu", 0);

  for (const code of codes) {
    const p = fetchOne(code).finally(() => active.delete(p));
    active.add(p);
    if (active.size >= CONCURRENT) await Promise.race(active);
  }
  await Promise.all(active);

  return { processed, errors };
}

// ── Image sync ────────────────────────────────────────────────────
// Priority 1: maps with no image at all
// Priority 2: active maps (current_ccu > 0) not checked in last 15 minutes
// Runs every 15 min — 5 concurrent requests, processes up to 100 maps per run.
// Top 50 maps also get images refreshed every 2 min via syncMetricsTop.

export async function syncImages(batchSize = 100): Promise<{ updated: number; unchanged: number; errors: number }> {
  const supabase = createServerClient();
  const cutoff15m = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("islands")
    .select("code, image_url")
    .or(`image_url.is.null,and(current_ccu.gt.0,image_synced_at.lt.${cutoff15m}),and(current_ccu.gt.0,image_synced_at.is.null)`)
    .order("current_ccu", { ascending: false, nullsFirst: false })
    .limit(batchSize);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { code: string; image_url: string | null }[];
  if (!rows.length) return { updated: 0, unchanged: 0, errors: 0 };

  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  const CONCURRENT = 5;
  const active = new Set<Promise<void>>();

  async function processOne({ code, image_url: oldUrl }: { code: string; image_url: string | null }) {
    try {
      // Skip if already stored in our CDN — only re-fetch if image_url points to external CDN
      if (isStorageUrl(oldUrl)) {
        unchanged++;
        return;
      }
      const newUrl = await fetchIslandImageUrl(code);
      if (!newUrl) {
        unchanged++;
        return;
      }
      // Upload to Supabase Storage
      const storageUrl = await uploadIslandImage(code, newUrl);
      const finalUrl = storageUrl ?? newUrl;
      await supabase
        .from("islands")
        .update({ image_url: finalUrl, image_synced_at: now } as object)
        .eq("code", code);
      updated++;
    } catch {
      errors++;
    }
  }

  for (const row of rows) {
    const p = processOne(row).finally(() => active.delete(p));
    active.add(p);
    if (active.size >= CONCURRENT) await Promise.race(active);
  }
  await Promise.all(active);

  return { updated, unchanged, errors };
}
