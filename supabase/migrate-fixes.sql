-- ============================================================
-- MIGRATION: Fix missing columns + enable Realtime
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add missing columns
ALTER TABLE islands ADD COLUMN IF NOT EXISTS current_ccu INTEGER DEFAULT 0;
ALTER TABLE islands ADD COLUMN IF NOT EXISTS metrics_fetched_at TIMESTAMPTZ;

-- 2. Update popular_islands view to sort by current_ccu properly
DROP VIEW IF EXISTS popular_islands;
CREATE VIEW popular_islands AS
SELECT
  i.code,
  i.title,
  i.creator_code,
  i.created_in,
  i.tags,
  i.category,
  i.image_url,
  i.current_ccu,
  i.metrics_fetched_at,
  m.peak_ccu,
  m.unique_players,
  m.plays,
  m.favorites,
  m.recommendations,
  m.avg_minutes_per_player,
  m.retention_d1,
  m.retention_d7,
  m.recorded_at AS metrics_at
FROM islands i
LEFT JOIN latest_island_metrics m ON m.island_code = i.code
ORDER BY COALESCE(i.current_ccu, 0) DESC;

-- 3. Enable Realtime on both tables (safe — skips if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'island_metrics'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE island_metrics;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'islands'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE islands;
  END IF;
END $$;

-- 4. Index for fast metrics_fetched_at lookup (speeds up cron)
CREATE INDEX IF NOT EXISTS idx_islands_metrics_fetched
  ON islands (metrics_fetched_at ASC NULLS FIRST);
