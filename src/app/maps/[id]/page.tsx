import { getIslandByCode, getIslandMetricsHistory, getRelatedMaps } from "@/lib/api";
import StatsChart from "@/components/StatsChart";
import MapCard from "@/components/MapCard";
import CopyButton from "@/components/CopyButton";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const island = await getIslandByCode(params.id).catch(() => null);
  if (!island) return { title: "Map Not Found — FN Maps Stats" };

  const plays = island.plays ? `${(island.plays / 1000).toFixed(0)}K plays` : null;
  const players = island.current_ccu ? `${island.current_ccu} playing now` : null;
  const desc = [plays, players].filter(Boolean).join(" · ");

  return {
    title: `${island.title} — FN Maps Stats`,
    description: `${island.title} by @${island.creator_code ?? "Unknown"}. ${desc}`,
    openGraph: {
      title: island.title,
      description: `Fortnite Creative map by @${island.creator_code ?? "Unknown"}. ${desc}`,
      images: island.image_url ? [{ url: island.image_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: island.title,
      description: `Fortnite Creative map by @${island.creator_code ?? "Unknown"}. ${desc}`,
      images: island.image_url ? [island.image_url] : [],
    },
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-bold text-secondary">{value}</p>
      <p className="text-muted text-xs mt-1">{label}</p>
    </div>
  );
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default async function MapDetailPage({ params }: { params: { id: string } }) {
  const [island, history, related] = await Promise.all([
    getIslandByCode(params.id).catch(() => null),
    getIslandMetricsHistory(params.id, 144).catch(() => []),
    getIslandByCode(params.id)
      .then(i => getRelatedMaps(params.id, i?.tags ?? [], 6))
      .catch(() => []),
  ]);

  if (!island) notFound();

  const liveCcu = island.current_ccu ?? island.peak_ccu ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {island.image_url && (
          <div className="relative h-64 md:h-80 w-full">
            <Image
              src={island.image_url}
              alt={island.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            {liveCcu > 0 && (
              <span className="absolute top-4 right-4 text-sm font-medium px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-sm">
                🟢 {fmt(liveCcu)} playing now
              </span>
            )}
          </div>
        )}

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{island.title}</h1>
              <p className="text-muted text-sm mb-3">
                by{" "}
                <a
                  href={`/creator/${encodeURIComponent(island.creator_code ?? "")}`}
                  className="text-primary hover:underline font-medium"
                >
                  @{island.creator_code ?? "Unknown"}
                </a>
                {island.created_in && (
                  <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {island.created_in}
                  </span>
                )}
              </p>

              {island.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {island.tags.map(tag => (
                    <a
                      key={tag}
                      href={`/maps?tag=${encodeURIComponent(tag)}`}
                      className="text-xs px-2 py-1 rounded bg-white/5 text-muted border border-white/5 hover:border-primary/40 hover:text-white transition-colors"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 font-mono text-sm bg-white/5 px-3 py-2 rounded-lg">
                <span className="text-muted">{island.code}</span>
                <CopyButton text={island.code} label="Copy" />
              </div>
              <a
                href={`https://www.fortnite.com/@${island.creator_code}/${island.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-center text-sm py-2"
              >
                ▶ Play in Fortnite
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Players Now"     value={fmt(island.current_ccu)} />
        <Stat label="Peak CCU (24h)"  value={fmt(island.peak_ccu)} />
        <Stat label="Unique Players"  value={fmt(island.unique_players)} />
        <Stat label="Total Plays"     value={fmt(island.plays)} />
        <Stat label="Favorites"       value={fmt(island.favorites)} />
        <Stat label="Recommendations" value={fmt(island.recommendations)} />
        <Stat label="Min / Player"    value={island.avg_minutes_per_player?.toFixed(1) ?? "—"} />
        <Stat
          label="Day-1 Retention"
          value={island.retention_d1 != null ? `${(island.retention_d1 * 100).toFixed(1)}%` : "—"}
        />
      </div>

      {/* ── Charts ───────────────────────────────────────── */}
      {history.length > 1 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Stats Over Time</h2>
          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4 text-muted">Peak Concurrent Players</h3>
            <StatsChart history={history} metric="peak_ccu" label="players" color="#6C63FF" />
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium mb-4 text-muted">Total Plays</h3>
            <StatsChart history={history} metric="plays" label="plays" color="#00D4FF" />
          </div>
        </div>
      )}

      {/* ── Related Maps ─────────────────────────────────── */}
      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Similar Maps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map(m => <MapCard key={m.code} island={m} />)}
          </div>
        </section>
      )}
    </div>
  );
}
