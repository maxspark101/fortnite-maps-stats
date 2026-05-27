-- ============================================================
-- Fortnite Maps Stats — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Islands (metadata from Epic Ecosystem API)
create table if not exists islands (
  code          text primary key,               -- e.g. "1234-5678-9012"
  title         text not null,
  creator_code  text,
  created_in    text,                           -- "UEFN" | "FNC"
  tags          text[] default '{}',
  category      text,
  image_url     text,
  current_ccu   integer default 0,             -- live player count (updated every sync cycle)
  last_synced_at timestamptz default now(),
  created_at    timestamptz default now()
);

-- Add current_ccu to existing tables (safe to run multiple times)
alter table islands add column if not exists current_ccu integer default 0;

-- 2. Island metrics — one row per snapshot (every 10 min)
create table if not exists island_metrics (
  id                    bigserial primary key,
  island_code           text references islands(code) on delete cascade,
  recorded_at           timestamptz default now(),
  peak_ccu              integer,
  unique_players        integer,
  plays                 integer,
  minutes_played        bigint,
  avg_minutes_per_player float,
  favorites             integer,
  recommendations       integer,
  retention_d1          float,
  retention_d7          float
);

-- Indexes
create index if not exists idx_metrics_island_time
  on island_metrics (island_code, recorded_at desc);

create index if not exists idx_islands_creator
  on islands (creator_code);

create index if not exists idx_islands_tags
  on islands using gin (tags);

-- 3. Latest metrics view (for fast homepage queries)
create or replace view latest_island_metrics as
select distinct on (island_code)
  island_code,
  recorded_at,
  peak_ccu,
  unique_players,
  plays,
  minutes_played,
  avg_minutes_per_player,
  favorites,
  recommendations,
  retention_d1,
  retention_d7
from island_metrics
order by island_code, recorded_at desc;

-- 4. Popular islands view (joined)
create or replace view popular_islands as
select
  i.code,
  i.title,
  i.creator_code,
  i.created_in,
  i.tags,
  i.category,
  i.image_url,
  i.current_ccu,
  m.peak_ccu,
  m.unique_players,
  m.plays,
  m.favorites,
  m.recommendations,
  m.avg_minutes_per_player,
  m.retention_d1,
  m.retention_d7,
  m.recorded_at as metrics_at
from islands i
left join latest_island_metrics m on m.island_code = i.code
order by coalesce(i.current_ccu, 0) desc;

-- ============================================================
-- Enable Realtime on island_metrics table
-- Run this separately if needed:
-- alter publication supabase_realtime add table island_metrics;
-- ============================================================
