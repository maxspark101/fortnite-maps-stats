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

  // Each bucket covers a code range using >= / < so PostgreSQL can use the PK B-tree index.
  const bucket = parseInt(req.nextUrl.searchParams.get("bucket") ?? "0", 10);
  const ranges: Record<number, [string, string]> = {
    0: ["0", "2"],   // 0xxxx – 1xxxx
    1: ["2", "4"],   // 2xxxx – 3xxxx
    2: ["4", "6"],   // 4xxxx – 5xxxx
    3: ["6", "8"],   // 6xxxx – 7xxxx
    4: ["8", "￿"], // 8xxxx – 9xxxx + all letter codes (experience_br etc.)
  };
  const [rangeFrom, rangeTo] = ranges[bucket] ?? ranges[0];

  let query = supabase
    .from("islands")
    .select("code")
    .eq("date_synced", false)
    .gte("code", rangeFrom)
    .order("code", { ascending: true })
    .limit(200);
  if (rangeTo !== "￿") query = query.lt("code", rangeTo);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: true, done: true, bucket, processed: 0 });

  const codes = data.map((r: { code: string }) => r.code);

  let updated = 0;
  let notFound = 0;
  const CONCURRENT = 8;
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
