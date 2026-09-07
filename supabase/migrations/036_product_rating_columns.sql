-- Migration 036: Rating aggregation columns on catalog_products
-- Persisted by the review submission endpoint (and backfillable).

ALTER TABLE catalog_products
  ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing approved reviews (idempotent)
UPDATE catalog_products cp SET
  rating_count = agg.cnt,
  rating_average = CASE WHEN agg.cnt > 0 THEN ROUND(agg.avg_rating::NUMERIC, 2) ELSE 0 END
FROM (
  SELECT product_id, COUNT(*) AS cnt, AVG(rating) AS avg_rating
  FROM reviews
  WHERE status = 'APPROVED'
  GROUP BY product_id
) agg
WHERE agg.product_id = cp.id
  AND (cp.rating_count IS DISTINCT FROM agg.cnt);
