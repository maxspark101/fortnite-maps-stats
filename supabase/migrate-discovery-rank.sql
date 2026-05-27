-- ============================================================
-- MIGRATION: Add discovery_rank for Epic API ordering
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add discovery_rank column (position in Epic's popularity-ordered API)
ALTER TABLE islands ADD COLUMN IF NOT EXISTS discovery_rank INTEGER;

-- 2. Index for fast sorting by rank
CREATE INDEX IF NOT EXISTS idx_islands_discovery_rank
  ON islands (discovery_rank ASC NULLS LAST);

-- 3. Rebuild popular_islands view with discovery_rank + correct sort
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
  i.discovery_rank,
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
ORDER BY
  COALESCE(i.discovery_rank, 9999999) ASC,
  COALESCE(i.current_ccu, 0) DESC;
