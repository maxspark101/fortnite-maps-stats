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

  // Pick maps still holding discovery-era dates (2026-05-13 to 2026-05-28).
  // After processing: real date → updated, no date found → set to NULL (excluded from future runs).
  const { data, error } = await supabase
    .from("islands")
    .select("code")
    .gte("released_at", "2026-05-13")
    .lte("released_at", "2026-05-28T23:59:59Z")
    .order("peak_ccu", { ascending: false, nullsFirst: false })
    .limit(1500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: true, done: true, processed: 0 });

  const codes = data.map((r: { code: string }) => r.code);

  let updated = 0;
  let notFound = 0;
  const CONCURRENT = 20;
  const active = new Set<Promise<void>>();

  async function processOne(code: string) {
    const releasedAt = await fetchReleaseDate(code);
    if (releasedAt) {
      await supabase.from("islands").update({ released_at: releasedAt } as object).eq("code", code);
      updated++;
    } else {
      // Set to NULL so this map is excluded from future runs
      await supabase.from("islands").update({ released_at: null } as object).eq("code", code);
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
    .gte("released_at", "2026-05-13")
    .lte("released_at", "2026-05-28T23:59:59Z");

  return NextResponse.json({
    ok: true,
    processed: codes.length,
    updated,
    notFound,
    remaining: remaining.count ?? 0,
  });
}
