// ── Epic Ecosystem API raw shapes ──────────────────────────────
export interface EpicIsland {
  code: string;
  creatorCode: string;
  title: string;
  createdIn: "UEFN" | "FNC";
  tags: string[];
  category?: string;
  meta?: { page?: { cursor?: string } };
}

export interface EpicIslandsResponse {
  data: EpicIsland[];
  meta: { count: number; page?: { nextCursor?: string; prevCursor?: string } };
  links: { next?: string; prev?: string };
}

export interface EpicMetricPoint {
  value: number | null;
  timestamp: string;
}

export interface EpicRetentionPoint {
  d1: number | null;
  d7: number | null;
  timestamp: string;
}

export interface EpicIslandMetrics {
  peakCCU: EpicMetricPoint[];
  uniquePlayers: EpicMetricPoint[];
  plays: EpicMetricPoint[];
  minutesPlayed: EpicMetricPoint[];
  averageMinutesPerPlayer: EpicMetricPoint[];
  favorites: EpicMetricPoint[];
  recommendations: EpicMetricPoint[];
  retention: EpicRetentionPoint[];
}

// ── App-level types (from Supabase views) ──────────────────────
export interface Island {
  code: string;
  title: string;
  creator_code: string | null;
  created_in: string | null;
  tags: string[];
  category: string | null;
  image_url: string | null;
  current_ccu: number | null;
  discovery_rank: number | null;   // position in Epic's discovery API (lower = more popular)
  // latest metrics (from popular_islands view)
  peak_ccu: number | null;
  unique_players: number | null;
  plays: number | null;
  minutes_played: number | null;
  avg_minutes_per_player: number | null;
  favorites: number | null;
  recommendations: number | null;
  retention_d1: number | null;
  retention_d7: number | null;
  metrics_at: string | null;
}

export interface IslandMetricSnapshot {
  island_code: string;
  recorded_at: string;
  peak_ccu: number | null;
  unique_players: number | null;
  plays: number | null;
  favorites: number | null;
  recommendations: number | null;
  avg_minutes_per_player: number | null;
  retention_d1: number | null;
  retention_d7: number | null;
}

export type SortOption = "current_ccu" | "discovery_rank" | "peak_ccu" | "plays" | "favorites" | "newest";
export type MetricWindow = "last10Minutes" | "lastHour" | "last24Hours" | "last7Days";
