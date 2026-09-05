-- ============================================================================
-- WAW MARKETPLACE: Schema Consolidation Migration
-- ============================================================================
-- Purpose: Resolve Legacy vs Catalog duality, fix column naming inconsistencies,
--          and clean up phantom references.
--
-- Run ORDER: This should be run AFTER all previous migrations (001-011).
-- Risk: LOW - All changes are additive (renaming, adding views) or fix bugs.
-- ============================================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. COLUMN RENAMES: Standardize order status column naming
-- ──────────────────────────────────────────────────────────────────────────────

-- The API code uses `global_status` everywhere (17+ references).
-- The legacy schema.sql defined `order_status`. SCHEMA_COMPLETE uses `global_status`.
-- If the column `order_status` exists but `global_status` doesn't, rename it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'global_status'
  ) THEN
    ALTER TABLE orders RENAME COLUMN order_status TO global_status;
    RAISE NOTICE 'Renamed orders.order_status -> orders.global_status';
  END IF;
END $$;

-- Standardize total column: API uses `total_amount_pkr`, legacy used `total_pkr`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_pkr'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'total_amount_pkr'
  ) THEN
    ALTER TABLE orders RENAME COLUMN total_pkr TO total_amount_pkr;
    RAISE NOTICE 'Renamed orders.total_pkr -> orders.total_amount_pkr';
  END IF;
END $$;

-- Standardize serviceability table name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'serviceability_locations'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'serviceable_cities'
  ) THEN
    ALTER TABLE serviceability_locations RENAME TO serviceable_cities;
    RAISE NOTICE 'Renamed serviceability_locations -> serviceable_cities';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ADD MISSING COLUMNS: Ensure all columns the API expects exist
-- ──────────────────────────────────────────────────────────────────────────────

-- Ensure orders has shipping_province (some schemas may be missing it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'shipping_province'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_province TEXT DEFAULT 'Punjab';
    RAISE NOTICE 'Added orders.shipping_province';
  END IF;
END $$;

-- Ensure orders has cod_fee_pkr
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cod_fee_pkr'
  ) THEN
    ALTER TABLE orders ADD COLUMN cod_fee_pkr NUMERIC(12,2) DEFAULT 0;
    RAISE NOTICE 'Added orders.cod_fee_pkr';
  END IF;
END $$;

-- Ensure orders has discount_pkr
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'discount_pkr'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_pkr NUMERIC(12,2) DEFAULT 0;
    RAISE NOTICE 'Added orders.discount_pkr';
  END IF;
END $$;

-- Ensure stores has banner_url
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE stores ADD COLUMN banner_url TEXT;
    RAISE NOTICE 'Added stores.banner_url';
  END IF;
END $$;

-- Ensure stores has rating_count
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'rating_count'
  ) THEN
    ALTER TABLE stores ADD COLUMN rating_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added stores.rating_count';
  END IF;
END $$;

-- Ensure stores has response_rate
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'response_rate'
  ) THEN
    ALTER TABLE stores ADD COLUMN response_rate NUMERIC(5,2) DEFAULT 0;
    RAISE NOTICE 'Added stores.response_rate';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. COLUMN TYPE SAFETY: Ensure TEXT types for status columns
--    (Avoids enum mismatch issues between legacy and catalog)
-- ──────────────────────────────────────────────────────────────────────────────

-- Ensure global_status is TEXT, not an enum type
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'global_status';

  IF col_type = 'USER-DEFINED' THEN
    -- Column is an enum type, alter to TEXT
    ALTER TABLE orders ALTER COLUMN global_status TYPE TEXT USING global_status::text;
    RAISE NOTICE 'Converted orders.global_status from enum to TEXT';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. FIX RECONCILIATION: store_orders uses subtotal_pkr, not total_pkr
-- ──────────────────────────────────────────────────────────────────────────────

-- Ensure store_orders has the columns the API expects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_orders' AND column_name = 'subtotal_pkr'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_orders' AND column_name = 'total_pkr'
  ) THEN
    ALTER TABLE store_orders RENAME COLUMN total_pkr TO subtotal_pkr;
    RAISE NOTICE 'Renamed store_orders.total_pkr -> store_orders.subtotal_pkr';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. CLEAN UP: Create a unified view for backward compatibility
-- ──────────────────────────────────────────────────────────────────────────────

-- Create a view that unifies catalog_products + seller_offers for any code
-- that still expects a flat "products" shape
CREATE OR REPLACE VIEW v_products_unified AS
SELECT
  cp.id AS catalog_product_id,
  cp.title,
  cp.title_urdu,
  cp.slug,
  cp.description,
  cp.category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  cp.images,
  cp.thumbnail,
  cp.brand,
  so.id AS offer_id,
  so.store_id,
  s.name AS store_name,
  s.slug AS store_slug,
  s.city AS store_city,
  so.sku,
  so.price_pkr,
  so.original_price_pkr,
  so.condition,
  so.is_express,
  so.status AS offer_status,
  (SELECT COALESCE(SUM(il.quantity), 0) FROM inventory_ledger il
   JOIN offer_variants ov2 ON ov2.id = il.offer_variant_id
   WHERE ov2.offer_id = so.id) AS stock_quantity,
  (so.status = 'ACTIVE') AS offer_active,
  cp.is_active AS product_active,
  cp.created_at
FROM catalog_products cp
LEFT JOIN categories c ON c.id = cp.category_id
LEFT JOIN seller_offers so ON so.catalog_product_id = cp.id AND so.status = 'ACTIVE'
LEFT JOIN stores s ON s.id = so.store_id;

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. INDEXES: Add missing performance indexes
-- ──────────────────────────────────────────────────────────────────────────────

-- Fix: Index on correct column names (avoid phantom references)
CREATE INDEX IF NOT EXISTS idx_store_orders_store_id ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_seller_offers_store_id ON seller_offers(store_id);
CREATE INDEX IF NOT EXISTS idx_seller_offers_catalog_product_id ON seller_offers(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_offer_variant_id ON inventory_ledger(offer_variant_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_global_status ON orders(global_status);
CREATE INDEX IF NOT EXISTS idx_shipments_store_order_id ON shipments(store_order_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. ARCHIVE NOTICE: Mark legacy schema.sql as deprecated
-- ──────────────────────────────────────────────────────────────────────────────

-- This is a comment-only marker. The actual file deletion should be done
-- as a separate step after verifying this migration works.
-- NOTE: apps/api/src/database/schema.sql is DEPRECATED.
-- Use supabase/migrations/SCHEMA_COMPLETE.sql as the source of truth.

COMMIT;

-- ============================================================================
-- POST-MIGRATION: Run these verification queries to confirm consistency
-- ============================================================================

-- 1. Verify orders has global_status (not order_status)
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'orders' AND column_name IN ('global_status', 'order_status');

-- 2. Verify store_orders has subtotal_pkr (not total_pkr)
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'store_orders' AND column_name IN ('subtotal_pkr', 'total_pkr');

-- 3. Verify unified view works
-- SELECT COUNT(*) FROM v_products_unified WHERE offer_status = 'APPROVED';

-- 4. Check for any remaining enum type usage
-- SELECT t.typname, e.enumlabel
-- FROM pg_type t
-- JOIN pg_enum e ON t.oid = e.enumtypid
-- WHERE t.typname IN ('orderstatus', 'paymentmethod', 'paymentstatus', 'payoutstatus');
