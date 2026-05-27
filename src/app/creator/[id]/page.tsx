import { getCreatorIslands, getCreatorStats } from "@/lib/api";
import MapCard from "@/components/MapCard";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-2xl font-bold text-secondary">{value}</p>
      <p className="text-muted text-xs mt-1">{label}</p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const creatorCode = decodeURIComponent(params.id);
  const stats = await getCreatorStats(creatorCode).catch(() => null);
  if (!stats || stats.totalMaps === 0) return { title: "Creator Not Found — FN Maps Stats" };

  return {
    title: `@${creatorCode} — Fortnite Creator Stats`,
    description: `${creatorCode} has ${stats.totalMaps} Fortnite Creative maps with ${fmt(stats.totalPlayers)} players now and ${fmt(stats.totalPlays)} total plays.`,
    openGraph: {
      title: `@${creatorCode} — Fortnite Creator`,
      description: `${stats.totalMaps} maps · ${fmt(stats.totalPlayers)} players now · ${fmt(stats.totalPlays)} plays`,
    },
  };
}

export default async function CreatorPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string };
}) {
  const creatorCode = decodeURIComponent(params.id);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let stats = null as Awaited<ReturnType<typeof getCreatorStats>> | null;
  let islands: Awaited<ReturnType<typeof getCreatorIslands>> = [];

  try {
    [stats, islands] = await Promise.all([
      getCreatorStats(creatorCode),
      getCreatorIslands(creatorCode, "current_ccu", PAGE_SIZE, offset),
    ]);
  } catch {}

  if (!stats || stats.totalMaps === 0) notFound();

  const totalPages = Math.ceil(stats.totalMaps / PAGE_SIZE);
  const initial = creatorCode[0]?.toUpperCase() ?? "?";

  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/creator/${encodeURIComponent(creatorCode)}${qs ? `?${qs}` : ""}`;
  }

  const pageWindow = () => {
    const delta = 2;
    const pages: (number | "...")[] = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    pages.push(1);
    if (left > 2) pages.push("...");
    for (let p = left; p <= right; p++) pages.push(p);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* ── Hero ── */}
      <div className="card p-6 md:p-8">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {initial}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">@{creatorCode}</h1>
            <p className="text-muted text-sm mt-1">Fortnite Creative Creator</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <StatBox label="Maps Published"  value={fmt(stats.totalMaps)} />
              <StatBox label="Players Now"     value={fmt(stats.totalPlayers)} />
              <StatBox label="Total Plays"     value={fmt(stats.totalPlays)} />
              <StatBox label="Total Favorites" value={fmt(stats.totalFavorites)} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Maps grid ── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold">
            Maps <span className="text-muted text-base font-normal">({fmt(stats.totalMaps)})</span>
          </h2>
          <div className="text-sm text-muted">Sorted by players</div>
        </div>

        {islands.length === 0 ? (
          <div className="card p-12 text-center text-muted">No maps found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {islands.map(island => (
              <MapCard key={island.code} island={island} />
            ))}
          </div>
        )}
      </section>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 flex-wrap pt-2">
          {page > 1 ? (
            <a href={pageUrl(page - 1)} className="px-3 py-1.5 rounded-lg bg-surface text-muted hover:text-white text-sm transition-colors">
              ← Prev
            </a>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-surface text-white/20 text-sm cursor-not-allowed">← Prev</span>
          )}

          {pageWindow().map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="px-2 text-muted text-sm">...</span>
            ) : (
              <a
                key={p}
                href={pageUrl(p as number)}
                className={`min-w-[36px] text-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  p === page ? "bg-primary text-white font-bold" : "bg-surface text-muted hover:text-white"
                }`}
              >
                {p}
              </a>
            )
          )}

          {page < totalPages ? (
            <a href={pageUrl(page + 1)} className="px-3 py-1.5 rounded-lg bg-surface text-muted hover:text-white text-sm transition-colors">
              Next →
            </a>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-surface text-white/20 text-sm cursor-not-allowed">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
