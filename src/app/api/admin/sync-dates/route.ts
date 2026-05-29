import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import crossFetch from "cross-fetch";

export const maxDuration = 55;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  Accept: "text/html,application/xhtml+xml",
};

// Fetches the real release date from fortnite.gg for a single map code.
async function fetchReleaseDate(code: string): Promise<string | null> {
  try {
    const res = await crossFetch(`https://fortnite.gg/island/${encodeURIComponent(code)}`, {
      headers: HEADERS,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<time[^>]*datetime='([^']+)'/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const secretQuery = req.nextUrl.searchParams.get("secret");
  const secret = process.env.CRON_SECRET;
  if (secretQuery !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // bucket=0..4 splits work across 5 parallel workers by first digit of code.
  // Each bucket covers ~20% of maps so workers don't overlap.
  const bucket = parseInt(req.nextUrl.searchParams.get("bucket") ?? "0", 10);
  const buckets: Record<number, string[]> = {
    0: ["0", "1"],
    1: ["2", "3"],
    2: ["4", "5"],
    3: ["6", "7"],
    4: ["8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],
  };
  const prefixes = buckets[bucket] ?? buckets[0];
  const orFilter = prefixes.map(p => `code.ilike.${p}%`).join(",");

  const { data, error } = await supabase
    .from("islands")
    .select("code")
    .eq("date_synced", false)
    .or(orFilter)
    .order("peak_ccu", { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: true, done: true, bucket, processed: 0 });

  const codes = data.map((r: { code: string }) => r.code);

  let updated = 0;
  let notFound = 0;
  const CONCURRENT = 20;
  const active = new Set<Promise<void>>();

  async function processOne(code: string) {
    const releasedAt = await fetchReleaseDate(code);
    if (releasedAt) {
      await supabase.from("islands").update({ released_at: releasedAt, date_synced: true } as object).eq("code", code);
      updated++;
    } else {
      await supabase.from("islands").update({ date_synced: true } as object).eq("code", code);
      notFound++;
    }
  }

  for (const code of codes) {
    const p = processOne(code).finally(() => active.delete(p));
    active.add(p);
    if (active.size >= CONCURRENT) await Promise.race(active);
  }
  await Promise.all(active);

  const remaining = await supabase
    .from("islands")
    .select("*", { count: "exact", head: true })
    .eq("date_synced", false);

  return NextResponse.json({
    ok: true,
    bucket,
    processed: codes.length,
    updated,
    notFound,
    remaining: remaining.count ?? 0,
  });
}
