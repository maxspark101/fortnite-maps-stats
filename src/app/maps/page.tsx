import { getPopularIslands, countIslands, getAllTags } from "@/lib/api";
import RealtimeIslands from "@/components/RealtimeIslands";
import type { Island, SortOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "current_ccu", label: "Players Now" },
  { value: "peak_ccu", label: "Peak Players (24h)" },
  { value: "plays", label: "Most Plays" },
  { value: "favorites", label: "Most Favorited" },
  { value: "newest", label: "Newest Maps" },
];

function buildUrl(sort: string, tag: string | undefined, page: number) {
  const params = new URLSearchParams({ sort });
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  return `/maps?${params.toString()}`;
}

export default async function MapsPage({
  searchParams,
}: {
  searchParams: { sort?: string; tag?: string; page?: string };
}) {
  const sort = (searchParams.sort as SortOption) ?? "current_ccu";
  const tag = searchParams.tag;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  let islands: Island[] = [];
  let total = 0;
  let allTags: string[] = [];

  try {
    [islands, total, allTags] = await Promise.all([
      getPopularIslands(sort, PAGE_SIZE, offset, tag),
      countIslands(tag),
      getAllTags(),
    ]);
  } catch {
    // DB not ready
  }

  const filtered = islands;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const pageWindow = () => {
    const delta = 3;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Browse Maps</h1>
        <span className="text-muted text-sm">{total.toLocaleString()} maps total</span>
      </div>

      {/* Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-muted text-sm">Sort by:</span>
        {SORT_OPTIONS.map(({ value, label }) => (
          <a
            key={value}
            href={buildUrl(value, tag, 1)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sort === value ? "bg-primary text-white" : "bg-surface text-muted hover:text-white"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Tag filter */}
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
        <a
          href={buildUrl(sort, undefined, 1)}
          className={`px-3 py-1 rounded-full text-xs transition-colors flex-shrink-0 ${
            !tag ? "bg-secondary/20 text-secondary" : "bg-surface text-muted hover:text-white"
          }`}
        >
          All
        </a>
        {allTags.filter(t => t.trim()).map((t) => (
          <a
            key={t}
            href={buildUrl(sort, t, 1)}
            className={`px-3 py-1 rounded-full text-xs transition-colors flex-shrink-0 ${
              tag === t ? "bg-secondary/20 text-secondary" : "bg-surface text-muted hover:text-white"
            }`}
          >
            {t}
          </a>
        ))}
      </div>

      <p className="text-muted text-sm">
        Page {page} of {totalPages.toLocaleString()} — showing {filtered.length} maps
      </p>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-muted">
          No maps found — make sure the sync has run
        </div>
      ) : (
        <RealtimeIslands initialIslands={filtered} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 flex-wrap pt-4">
          {page > 1 ? (
            <a
              href={buildUrl(sort, tag, page - 1)}
              className="px-3 py-1.5 rounded-lg bg-surface text-muted hover:text-white text-sm transition-colors"
            >
              ← Prev
            </a>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-surface text-white/20 text-sm cursor-not-allowed">
              ← Prev
            </span>
          )}

          {pageWindow().map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="px-2 text-muted text-sm">
                ...
              </span>
            ) : (
              <a
                key={p}
                href={buildUrl(sort, tag, p as number)}
                className={`min-w-[36px] text-center px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  p === page
                    ? "bg-primary text-white font-bold"
                    : "bg-surface text-muted hover:text-white"
                }`}
              >
                {p}
              </a>
            )
          )}

          {page < totalPages ? (
            <a
              href={buildUrl(sort, tag, page + 1)}
              className="px-3 py-1.5 rounded-lg bg-surface text-muted hover:text-white text-sm transition-colors"
            >
              Next →
            </a>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-surface text-white/20 text-sm cursor-not-allowed">
              Next →
            </span>
          )}
        </div>
      )}
    </div>
  );
}
