"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import MapCard from "./MapCard";
import type { Island, IslandMetricSnapshot } from "@/lib/types";

interface Props {
  initialIslands: Island[];
}

export default function RealtimeIslands({ initialIslands }: Props) {
  const [islands, setIslands] = useState<Island[]>(initialIslands);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [pulseCode, setPulseCode] = useState<string | null>(null);

  useEffect(() => {
    // Listen to new metrics — update stats + re-sort by current_ccu
    const metricsChannel = supabase
      .channel("island_metrics_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "island_metrics" },
        (payload) => {
          const snap = payload.new as IslandMetricSnapshot;
          setIslands((prev) => {
            const updated = prev.map((island) =>
              island.code === snap.island_code
                ? {
                    ...island,
                    peak_ccu: snap.peak_ccu,
                    unique_players: snap.unique_players,
                    plays: snap.plays,
                    favorites: snap.favorites,
                    recommendations: snap.recommendations,
                    avg_minutes_per_player: snap.avg_minutes_per_player,
                    retention_d1: snap.retention_d1,
                    retention_d7: snap.retention_d7,
                    metrics_at: snap.recorded_at,
                  }
                : island
            );
            // Re-sort by current_ccu descending
            return [...updated].sort(
              (a, b) => (b.current_ccu ?? b.peak_ccu ?? 0) - (a.current_ccu ?? a.peak_ccu ?? 0)
            );
          });
          setPulseCode(snap.island_code);
          setLastUpdate(new Date());
          setTimeout(() => setPulseCode(null), 2000);
        }
      )
      .subscribe();

    // Listen to islands table — current_ccu direct updates → re-sort
    const islandsChannel = supabase
      .channel("islands_ccu_live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "islands" },
        (payload) => {
          const row = payload.new as { code: string; current_ccu: number | null };
          if (row.current_ccu == null) return;
          setIslands((prev) => {
            const updated = prev.map((island) =>
              island.code === row.code
                ? { ...island, current_ccu: row.current_ccu }
                : island
            );
            return [...updated].sort(
              (a, b) => (b.current_ccu ?? 0) - (a.current_ccu ?? 0)
            );
          });
          setLastUpdate(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(islandsChannel);
    };
  }, []);

  return (
    <div>
      {lastUpdate && (
        <p className="text-xs text-muted mb-4 flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Last updated: {lastUpdate.toLocaleTimeString("en")}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {islands.map((island) => (
          <div
            key={island.code}
            className={pulseCode === island.code ? "ring-1 ring-secondary/60 rounded-xl transition-all" : ""}
          >
            <MapCard island={island} />
          </div>
        ))}
      </div>
    </div>
  );
}
