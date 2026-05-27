import { getPopularIslands, getPlatformStats, getNewestMaps } from "@/lib/api";
import RealtimeIslands from "@/components/RealtimeIslands";
import MapCard from "@/components/MapCard";
import type { Island } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default async function HomePage() {
  let islands: Island[] = [];
  let platform = null as Awaited<ReturnType<typeof getPlatformStats>> | null;
  let newest: Island[] = [];

  try {
    [islands, platform, newest] = await Promise.all([
      getPopularIslands("current_ccu", 24),
      getPlatformStats(),
      getNewestMaps(6),
    ]);
  } catch {
    // Supabase not configured yet
  }

  const stats = platform
    ? [
        { label: "Maps Tracked",    value: fmt(platform.total_maps) },
        { label: "Active Now",      value: fmt(platform.active_maps) },
        { label: "Players Now",     value: fmt(platform.total_players) },
        { label: "Total Plays",     value: fmt(platform.total_plays) },
      ]
    : [];

  return (
    <div className="space-y-14">

      {/* ── Hero ── */}
      <section className="text-center py-10">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Fortnite{" "}
          <span className="text-primary">Maps Stats</span>
        </h1>
        <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
          Live statistics for every Creative map — players, plays, and real-time data
        </p>

        {stats.length > 0 && (
          <div className="flex flex-wrap justify-center gap-8">
            {stats.map(({ label, value }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-secondary">{value}</p>
                <p className="text-muted text-sm">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-3 mt-8">
          <a href="/maps" className="btn-primary px-6 py-2.5">Browse Maps</a>
        </div>
      </section>

      {/* ── Live Grid ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Most Active Maps</h2>
            <p className="text-muted text-sm mt-1">Live player counts, updated every 10 minutes</p>
          </div>
          <a href="/maps?sort=current_ccu" className="text-sm text-primary hover:underline">
            View all →
          </a>
        </div>

        {islands.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <p className="text-muted">Database is empty — run the first sync</p>
            <code className="text-xs bg-white/5 px-3 py-1.5 rounded block w-fit mx-auto">
              POST /api/sync/islands
            </code>
          </div>
        ) : (
          <RealtimeIslands initialIslands={islands} />
        )}
      </section>

      {/* ── Newest Maps ── */}
      {newest.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Newest Maps</h2>
              <p className="text-muted text-sm mt-1">Recently added to Fortnite Creative</p>
            </div>
            <a href="/maps" className="text-sm text-primary hover:underline">
              View all →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newest.map(island => (
              <MapCard key={island.code} island={island} />
            ))}
          </div>
        </section>
      )}

      {/* ── Quick Links ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/maps?sort=plays",     icon: "🏆", label: "Most Played" },
          { href: "/maps?sort=favorites", icon: "❤️",  label: "Most Favorited" },
          { href: "/tags",                icon: "🏷️",  label: "Browse Tags" },
        ].map(({ href, icon, label }) => (
          <a
            key={href}
            href={href}
            className="card p-5 text-center hover:border-primary/40 transition-colors group"
          >
            <span className="text-3xl">{icon}</span>
            <p className="text-sm font-medium mt-2 group-hover:text-primary transition-colors">
              {label}
            </p>
          </a>
        ))}
      </section>

    </div>
  );
}
