-- ============================================================
-- Keyword Stats — run in Supabase SQL Editor
-- ============================================================

-- 1. Table to cache computed keyword counts
CREATE TABLE IF NOT EXISTS keyword_stats (
  keyword    TEXT PRIMARY KEY,
  map_count  INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keyword_stats_count
  ON keyword_stats (map_count DESC);

-- 2. Function that re-computes from ALL islands and populates the table
--    Uses PostgreSQL regexp to split titles the same way the JS code does.
CREATE OR REPLACE FUNCTION refresh_keyword_stats()
RETURNS jsonb AS $$
DECLARE
  stop_words TEXT[] := ARRAY[
    'a','an','the','in','on','at','to','for','of','and','or','by','with',
    'is','are','was','were','be','been','have','has','had','do','does','did',
    'will','would','could','should','can','that','this','i','you','he','she',
    'it','we','they','my','your','his','her','its','our','their','vs','ft',
    'new','best','map','maps','game','games','fortnite','creative','mode',
    'de','la','les','el','en','lo','se','le','du','des','un','une','aus','im'
  ];
  inserted_count INTEGER;
BEGIN
  DELETE FROM keyword_stats;

  INSERT INTO keyword_stats (keyword, map_count, updated_at)
  SELECT
    word,
    COUNT(DISTINCT code) AS map_count,
    NOW()
  FROM (
    SELECT
      code,
      lower(
        unnest(
          -- split on the same separators used in the JS client
          regexp_split_to_array(
            title,
            '[\s\-_\/\\|&+,.()\[\]{}"''!?*#@:;~<>]+'
          )
        )
      ) AS word
    FROM islands
    WHERE title IS NOT NULL AND title <> ''
  ) words
  WHERE
    length(word) >= 3
    AND word != ALL(stop_words)
    AND word !~ '^\d+$'
  GROUP BY word
  HAVING COUNT(DISTINCT code) > 10
  ORDER BY COUNT(DISTINCT code) DESC;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN jsonb_build_object('keywords', inserted_count, 'updated_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Run it once immediately to populate the table
SELECT refresh_keyword_stats();
