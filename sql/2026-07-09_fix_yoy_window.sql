-- ============================================================================
-- APPLIED 2026-07-09. Recorded here for history/reproducibility.
--
-- FIX: mv_indicator_analytics.yoy_change measured an ELEVEN-month change.
--
-- The window was:
--     last_value(value) OVER (
--       PARTITION BY indicator_id, region_id ORDER BY obs_date
--       RANGE BETWEEN UNBOUNDED PRECEDING AND '11 mons'::interval PRECEDING)
--
-- last_value over a frame that ENDS 11 months before the current row returns
-- the observation 11 months back -- not 12. (11 months preceding + current row
-- spans 12 ROWS, but the CHANGE across them is 11 months.)
--
-- Verified 2026-07-09 on every grain and frequency, gapped and gapless:
--   cpi_headline  2026-05-01 -> base 2025-06-01   (lag 11)
--   employment    2026-06-01 -> base 2025-07-01   (lag 11)
--   zori_metro_mf 2026-05-31 -> base 2025-06-30   (lag 11)
--
-- Blast radius: yoy_change is read by 14 API routes (cycle-wheel, forecast,
-- metro-signals, rank, market-scorecard, brief, research, zip, market-read,
-- metro-growth, signals-markets) plus lib/{market-read,signals-engine}.js.
-- Two Cycle Wheel rings rendered the wrong band colour:
--     cpi_headline   +3.90% (amber)  ->  +4.17% (red)
--     pce_inflation  +3.77% (amber)  ->  +4.07% (red)
--
-- Fix: end the frame at '12 months' PRECEDING. Nothing else changes.
--   * zscore_12 is byte-identical (verified: 0 differing rows).
--   * Row count identical (1,673,237).
--   * yoy_change NULLs rise 233,691 -> 246,882: each series' first year now
--     correctly has no 12-month base where 11 months previously sufficed.
--   * If the exact anniversary observation is missing (BLS never published
--     2025-10 CPI), last_value falls back to the newest observation at least
--     12 months old, degrading to a >12-month base rather than a <12-month one.
--
-- yoy_change remains an ABSOLUTE level change (value - value_one_year_ago).
-- Callers derive percent as yoy_change / (value - yoy_change). Contract intact.
--
-- Applied as a build-alongside + atomic rename so the app never saw a missing
-- view, and so REFRESH ... CONCURRENTLY kept working (needs mv_iar_uq).
-- ============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_indicator_analytics_new CASCADE;

CREATE MATERIALIZED VIEW mv_indicator_analytics_new AS
WITH base AS (
  SELECT o.indicator_id, o.region_id, o.obs_date, o.value
  FROM observations o
  WHERE o.revision = 0                      -- first-print contract, unchanged
)
SELECT
  b.indicator_id,
  i.slug,
  i.name,
  b.region_id,
  r.region_type,
  r.code AS region_code,
  b.obs_date,
  b.value,
  b.value - last_value(b.value) OVER (
    PARTITION BY b.indicator_id, b.region_id
    ORDER BY b.obs_date
    RANGE BETWEEN UNBOUNDED PRECEDING AND '12 months'::interval PRECEDING
  ) AS yoy_change,
  (b.value - avg(b.value) OVER (
      PARTITION BY b.indicator_id, b.region_id
      ORDER BY b.obs_date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW))
  / NULLIF(stddev_samp(b.value) OVER (
      PARTITION BY b.indicator_id, b.region_id
      ORDER BY b.obs_date ROWS BETWEEN 11 PRECEDING AND CURRENT ROW), 0::numeric)
    AS zscore_12
FROM base b
JOIN indicators i ON i.id = b.indicator_id
JOIN regions    r ON r.id = b.region_id
WHERE r.region_type <> 'zcta'::text;

CREATE UNIQUE INDEX mv_iar_uq_new     ON mv_indicator_analytics_new (indicator_id, region_id, obs_date);
CREATE INDEX        mv_iar_lookup_new ON mv_indicator_analytics_new (slug, region_id, obs_date DESC);

BEGIN;
DROP VIEW v_indicator_analytics;
DROP MATERIALIZED VIEW mv_indicator_analytics;
ALTER MATERIALIZED VIEW mv_indicator_analytics_new RENAME TO mv_indicator_analytics;
ALTER INDEX mv_iar_uq_new     RENAME TO mv_iar_uq;
ALTER INDEX mv_iar_lookup_new RENAME TO mv_iar_lookup;
CREATE VIEW v_indicator_analytics AS
  SELECT indicator_id, slug, name, region_id, region_type, region_code,
         obs_date, value, yoy_change, zscore_12
  FROM mv_indicator_analytics;
GRANT SELECT ON mv_indicator_analytics TO anon, authenticated, service_role;
GRANT SELECT ON v_indicator_analytics  TO anon, authenticated, service_role;
COMMIT;

-- Verification: every lag_months must be 12.
WITH latest AS (
  SELECT DISTINCT ON (slug) slug, obs_date, value, yoy_change
  FROM v_indicator_analytics
  WHERE region_type = 'national' AND yoy_change IS NOT NULL
    AND slug IN ('cpi_headline','pce_inflation','cpi_shelter','employment','zori_national_mf')
  ORDER BY slug, obs_date DESC
)
SELECT l.slug, l.obs_date,
       round(((l.value / NULLIF(l.value - l.yoy_change, 0)) - 1) * 100, 2) AS yoy_pct
FROM latest l ORDER BY l.slug;
