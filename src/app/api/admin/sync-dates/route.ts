import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import crossFetch from "cross-fetch";

export const maxDuration = 55;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  Accept: "text/html,application/xhtml+xml",
};

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
  if (secretQuery !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Use the existing released_at index (created earlier) to find maps still holding
  // our "discovery date" range (2026-05-13 to 2026-05-28).
  // This range scan on an indexed column is fast.
  const { data, error } = await supabase
    .from("islands")
    .select("code")
    .gte("released_at", "2026-05-13")
    .lte("released_at", "2026-05-28T23:59:59Z")
    .limit(150);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: true, done: true, processed: 0 });

  const codes = data.map((r: { code: string }) => r.code);

  let updated = 0;
  let notFound = 0;
  const CONCURRENT = 8;
  const active = new Set<Promise<void>>();

  async function processOne(code: string) {
    const releasedAt = await fetchReleaseDate(code);
    if (releasedAt) {
      // Real date from fortnite.gg — store it (may still be in May 2026 range for recent maps)
      await supabase.from("islands")
        .update({ released_at: releasedAt, date_synced: true } as object)
        .eq("code", code);
      updated++;
    } else {
      // No date on fortnite.gg — set sentinel so this map is never retried
      await supabase.from("islands")
        .update({ released_at: "2000-01-01T00:00:00Z", date_synced: true } as object)
        .eq("code", code);
      notFound++;
    }
  }

  for (const code of codes) {
    const p = processOne(code).finally(() => active.delete(p));
    active.add(p);
    if (active.size >= CONCURRENT) await Promise.race(active);
  }
  await Promise.all(active);

  return NextResponse.json({ ok: true, processed: codes.length, updated, notFound });
}
