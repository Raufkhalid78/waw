-- Migration 040: Aggregate product sales RPC
-- Returns the top N catalog products by units sold within a date window,
-- used by the best-sellers endpoint and badge computation.

CREATE OR REPLACE FUNCTION aggregate_product_sales(
  since_date   TIMESTAMPTZ,
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE(product_id TEXT, units_sold BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id       AS product_id,
    SUM(oi.quantity)    AS units_sold
  FROM order_items oi
  INNER JOIN orders o ON o.id = oi.order_id
  WHERE o.global_status IN ('DELIVERED', 'COMPLETED')
    AND o.created_at >= since_date
  GROUP BY oi.product_id
  ORDER BY units_sold DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION aggregate_product_sales(TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION aggregate_product_sales(TIMESTAMPTZ, INTEGER) TO anon;

INSERT INTO schema_migrations (version, applied_at) VALUES ('040_aggregate_product_sales', NOW()) ON CONFLICT DO NOTHING;
