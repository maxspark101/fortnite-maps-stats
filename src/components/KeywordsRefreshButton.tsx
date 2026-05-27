"use client";

import { useState, useTransition } from "react";
import { refreshKeywordsAction } from "@/app/keywords/actions";

export default function KeywordsRefreshButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleRefresh() {
    setResult(null);
    startTransition(async () => {
      const res = await refreshKeywordsAction();
      if (res.ok) {
        setResult(`Updated — ${res.keywords ?? "?"} keywords computed`);
      } else {
        setResult(`Error: ${res.error}`);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {isPending ? "Refreshing…" : "Refresh Now"}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
          {result}
        </span>
      )}
    </div>
  );
}
