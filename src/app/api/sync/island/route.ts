import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fetchIslandMetrics } from "@/lib/api";
import { fetchIslandImageUrl } from "@/lib/epic-auth";

// POST /api/sync/island  body: { code: "1234-5678-9012" }
export async function POST(req: NextRequest) {
  const { code } = await req.json().catch(() => ({}));
  if (!code || !/^\d{4}-\d{4}-\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Fetch from Epic API
  const res = await fetch(`https://api.fortnite.com/ecosystem/v1/islands/${encodeURIComponent(code)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) return NextResponse.json({ error: `Epic API ${res.status}` }, { status: 404 });
  const island = await res.json();

  // Image + metrics in parallel
  const [imageUrl, metrics] = await Promise.allSettled([
    fetchIslandImageUrl(code),
    fetchIslandMetrics(code, "last24Hours").catch(() => null),
  ]);

  const img = imageUrl.status === "fulfilled" ? (imageUrl.value ?? "") : "";
  const m = metrics.status === "fulfilled" ? metrics.value : null;

  const latestVal = (pts: { value: number | null; timestamp: string }[]) =>
    pts?.length ? [...pts].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]?.value ?? null : null;

  const { error } = await supabase.from("islands").upsert({
    code: island.code,
    title: island.title,
    creator_code: island.creatorCode ?? null,
    created_in: island.createdIn ?? null,
    tags: island.tags ?? [],
    category: island.category ?? null,
    image_url: img,
    last_synced_at: now,
  }, { onConflict: "code" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (m) {
    const ccu = latestVal(m.peakCCU ?? []);
    await supabase.from("island_metrics").insert({
      island_code: code, recorded_at: now,
      peak_ccu: ccu,
      unique_players: latestVal(m.uniquePlayers ?? []),
      plays: latestVal(m.plays ?? []),
      minutes_played: latestVal(m.minutesPlayed ?? []),
      avg_minutes_per_player: latestVal(m.averageMinutesPerPlayer ?? []),
      favorites: latestVal(m.favorites ?? []),
      recommendations: latestVal(m.recommendations ?? []),
    }).then(() => {});
    if (ccu != null) await supabase.from("islands").update({ current_ccu: ccu }).eq("code", code);
  }

  return NextResponse.json({ ok: true, code, title: island.title, image: img, hasMetrics: !!m });
}
