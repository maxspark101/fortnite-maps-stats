"use client";

import { useState, useMemo } from "react";

interface Keyword {
  keyword: string;
  count: number;
}

export default function KeywordsTable({
  keywords,
  maxCount,
}: {
  keywords: Keyword[];
  maxCount: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return keywords;
    return keywords.filter(k => k.keyword.includes(q));
  }, [keywords, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleSearch}
            placeholder="Search keywords…"
            className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary/60 transition-colors"
          />
        </div>
        <span className="text-muted text-sm shrink-0">
          {filtered.length.toLocaleString()} keywords
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-muted text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 w-10">#</th>
              <th className="text-left px-4 py-3">Keyword</th>
              <th className="text-right px-4 py-3">Maps in DB</th>
              <th className="text-right px-4 py-3 hidden sm:table-cell">Frequency</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(({ keyword, count }, i) => {
              const globalRank = (page - 1) * PAGE_SIZE + i + 1;
              return (
                <tr key={keyword} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2.5 text-muted text-xs">{globalRank}</td>
                  <td className="px-4 py-2.5">
                    <a
                      href={`/search?q=${encodeURIComponent(keyword)}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {keyword}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">
                    {count.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-muted text-xs w-10 text-right">
                        {((count / maxCount) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} of {totalPages.toLocaleString()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-surface text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-surface text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
