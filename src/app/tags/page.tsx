import { getTagsWithStats } from "@/lib/api";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default async function TagsPage() {
  const tags = await getTagsWithStats().catch(() => []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Browse by Tag</h1>
        <p className="text-muted mt-2">
          {tags.length} tags across all Fortnite Creative maps
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="card p-12 text-center text-muted">No tags found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map(({ tag, map_count, total_players }) => (
            <a
              key={tag}
              href={`/maps?tag=${encodeURIComponent(tag)}`}
              className="card p-5 hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-base font-semibold group-hover:text-primary transition-colors capitalize">
                  {tag}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                  {fmt(map_count)} maps
                </span>
              </div>
              <p className="text-muted text-sm mt-2">
                {fmt(total_players)} players now
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
