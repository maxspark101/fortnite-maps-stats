import Image from "next/image";
import Link from "next/link";
import type { Island } from "@/lib/types";

const TAG_ICONS: Record<string, string> = {
  pvp: "⚔️", boxfight: "🥊", deathrun: "💀", racing: "🏎️",
  puzzle: "🧩", roleplay: "🎭", horror: "👻", tycoon: "💰",
  parkour: "🏃", adventure: "🗺️", survival: "🏕️", creative: "🎨",
  heroes: "🦸", "star wars": "⭐", tmnt: "🐢", marvel: "🦸",
};

function getIcon(tags: string[]): string {
  for (const tag of tags ?? []) {
    const match = TAG_ICONS[tag.toLowerCase()];
    if (match) return match;
  }
  return "🗺️";
}

function codeToGradient(code: string): { bg: string; accent: string } {
  const n = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const h1 = n % 360;
  const h2 = (n * 13 + 120) % 360;
  return {
    bg: `linear-gradient(135deg, hsl(${h1},55%,15%) 0%, hsl(${h2},65%,10%) 100%)`,
    accent: `hsl(${h1},70%,50%)`,
  };
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function MapCard({ island }: { island: Island }) {
  const liveCcu = island.current_ccu ?? island.peak_ccu ?? 0;
  const hasPlayers = liveCcu > 0;
  const { bg, accent } = codeToGradient(island.code);
  const icon = getIcon(island.tags ?? []);

  return (
    <Link
      href={`/maps/${island.code}`}
      className="card group hover:border-primary/50 transition-all block hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="relative h-44 overflow-hidden">
        {island.image_url && island.image_url.length > 5 ? (
          <Image
            src={island.image_url}
            alt={island.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2" style={{ background: bg }}>
            {/* Decorative rings */}
            <div
              className="absolute w-32 h-32 rounded-full opacity-10"
              style={{ background: accent, filter: "blur(20px)" }}
            />
            <span className="text-5xl relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300">
              {icon}
            </span>
            <span className="text-[10px] font-mono text-white/20 relative z-10">
              {island.code}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {hasPlayers && (
          <span className="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-sm">
            🟢 {fmt(liveCcu)} now
          </span>
        )}

        {island.created_in && (
          <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/40 text-white/60 backdrop-blur-sm">
            {island.created_in}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {island.title}
        </h3>
        <p className="text-muted text-xs mb-3">@{island.creator_code ?? "Unknown"}</p>

        <div className="grid grid-cols-3 gap-1 text-center mb-3">
          {[
            { label: "Plays", value: fmt(island.plays) },
            { label: "Favorites", value: fmt(island.favorites) },
            { label: "Min/Player", value: island.avg_minutes_per_player ? island.avg_minutes_per_player.toFixed(0) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-lg p-1.5">
              <p className="text-secondary text-xs font-bold">{value}</p>
              <p className="text-muted text-[10px]">{label}</p>
            </div>
          ))}
        </div>

        {island.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {island.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted border border-white/5">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
