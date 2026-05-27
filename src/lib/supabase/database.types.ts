export type Database = {
  public: {
    Tables: {
      islands: {
        Row: {
          code: string;
          title: string;
          creator_code: string | null;
          created_in: string | null;
          tags: string[];
          category: string | null;
          image_url: string | null;
          last_synced_at: string;
          created_at: string;
        };
        Insert: {
          code: string;
          title: string;
          creator_code?: string | null;
          created_in?: string | null;
          tags?: string[];
          category?: string | null;
          image_url?: string | null;
          last_synced_at?: string;
          created_at?: string;
        };
        Update: {
          code?: string;
          title?: string;
          creator_code?: string | null;
          created_in?: string | null;
          tags?: string[];
          category?: string | null;
          image_url?: string | null;
          last_synced_at?: string;
        };
      };
      island_metrics: {
        Row: {
          id: number;
          island_code: string;
          recorded_at: string;
          peak_ccu: number | null;
          unique_players: number | null;
          plays: number | null;
          minutes_played: number | null;
          avg_minutes_per_player: number | null;
          favorites: number | null;
          recommendations: number | null;
          retention_d1: number | null;
          retention_d7: number | null;
        };
        Insert: {
          id?: number;
          island_code: string;
          recorded_at?: string;
          peak_ccu?: number | null;
          unique_players?: number | null;
          plays?: number | null;
          minutes_played?: number | null;
          avg_minutes_per_player?: number | null;
          favorites?: number | null;
          recommendations?: number | null;
          retention_d1?: number | null;
          retention_d7?: number | null;
        };
        Update: Record<string, never>;
      };
    };
    Views: {
      latest_island_metrics: {
        Row: {
          island_code: string;
          recorded_at: string;
          peak_ccu: number | null;
          unique_players: number | null;
          plays: number | null;
          minutes_played: number | null;
          avg_minutes_per_player: number | null;
          favorites: number | null;
          recommendations: number | null;
          retention_d1: number | null;
          retention_d7: number | null;
        };
      };
      popular_islands: {
        Row: {
          code: string;
          title: string;
          creator_code: string | null;
          created_in: string | null;
          tags: string[];
          category: string | null;
          image_url: string | null;
          last_synced_at: string;
          created_at: string;
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
        };
      };
    };
  };
};
