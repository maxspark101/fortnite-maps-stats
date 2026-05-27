import { searchIslands } from "@/lib/api";
import MapCard from "@/components/MapCard";
import type { Island } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim() ?? "";
  let results: Island[] = [];

  if (query) {
    try {
      results = await searchIslands(query, 50);
    } catch {
      // DB not ready
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search</h1>

      <form method="get" action="/search">
        <div className="flex gap-3">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by name, creator, or map code..."
            className="flex-1 bg-surface border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-colors"
            autoFocus
          />
          <button type="submit" className="btn-primary">Search</button>
        </div>
      </form>

      {query && (
        <p className="text-muted text-sm">
          {results.length} result{results.length !== 1 ? "s" : ""} for &quot;{query}&quot;
        </p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((island) => (
            <MapCard key={island.code} island={island} />
          ))}
        </div>
      )}

      {query && results.length === 0 && (
        <div className="card p-12 text-center text-muted">
          No results for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
