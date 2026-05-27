import { getTopKeywords, getKeywordsUpdatedAt } from "@/lib/api";
import KeywordsRefreshButton from "@/components/KeywordsRefreshButton";
import KeywordsTable from "@/components/KeywordsTable";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  const [keywords, updatedAt] = await Promise.all([
    getTopKeywords(5000).catch(() => []),
    getKeywordsUpdatedAt().catch(() => null),
  ]);

  const max = keywords[0]?.count ?? 1;
  const cloudWords = keywords.slice(0, 150);

  const lastUpdated = updatedAt
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(updatedAt))
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Top Keywords</h1>
          <p className="text-muted mt-2">
            Keywords used in map titles —{" "}
            <span className="font-semibold text-white">{keywords.length.toLocaleString()}</span> keywords
            {" "}(each used in <span className="font-semibold text-white">&gt;10</span> maps)
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted mt-1">Last updated: {lastUpdated}</p>
          )}
        </div>
        <KeywordsRefreshButton />
      </div>

      {keywords.length === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <p className="text-muted">No keyword data yet.</p>
          <p className="text-sm text-muted">
            Run the SQL migration in Supabase first:
          </p>
          <code className="block text-xs bg-white/5 px-4 py-2 rounded mx-auto w-fit">
            supabase/migrate-keywords.sql
          </code>
          <p className="text-sm text-muted">then click <strong className="text-white">Refresh Now</strong> above.</p>
        </div>
      ) : (
        <>
          {/* ── Word Cloud (top 150) ── */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              Word Cloud
              <span className="text-muted text-sm font-normal ml-2">top 150</span>
            </h2>
            <div className="card p-8">
              <div className="flex flex-wrap gap-3 leading-relaxed">
                {cloudWords.map(({ keyword, count }) => {
                  const ratio = count / max;
                  const size =
                    ratio > 0.7  ? "text-4xl" :
                    ratio > 0.45 ? "text-3xl" :
                    ratio > 0.25 ? "text-2xl" :
                    ratio > 0.12 ? "text-xl"  :
                    ratio > 0.06 ? "text-lg"  :
                    ratio > 0.03 ? "text-base" : "text-sm";
                  const color =
                    ratio > 0.5  ? "text-white" :
                    ratio > 0.2  ? "text-white/80" :
                    ratio > 0.08 ? "text-white/60" : "text-white/40";

                  return (
                    <a
                      key={keyword}
                      href={`/search?q=${encodeURIComponent(keyword)}`}
                      className={`${size} ${color} font-semibold hover:text-primary transition-colors`}
                      title={`${count.toLocaleString()} maps`}
                    >
                      {keyword}
                    </a>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Full table (all keywords, searchable) ── */}
          <section>
            <h2 className="text-xl font-semibold mb-4">
              All Keywords
              <span className="text-muted text-sm font-normal ml-2">
                {keywords.length.toLocaleString()} total · 100 per page · searchable
              </span>
            </h2>
            <KeywordsTable keywords={keywords} maxCount={max} />
          </section>
        </>
      )}
    </div>
  );
}
