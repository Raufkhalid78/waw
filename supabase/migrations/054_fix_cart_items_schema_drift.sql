-- ==============================================================================
-- 054: Fix cart_items schema drift (production cart 500s)
-- ==============================================================================
-- The deployed API reads cart_items.variant_id as an offer_variants id
-- (cart.service.ts embeds offer_variants + seller_offers + catalog_products
-- via that column), but the column's FK still references the LEGACY
-- product_variants table from migration 001. PostgREST therefore fails the
-- embedded join with PGRST200 ("no relationship between cart_items and
-- offer_variants"), which the cart controller surfaces as HTTP 500 —
-- GET /api/cart and all guest cart operations are broken in production.
--
-- This migration retargets the FK to offer_variants (the table the column
-- has actually been storing since the catalog migration), preserving the
-- unique constraint and dropping stale rows that can't be retargeted
-- (carts are ephemeral — dropping rows is safe; checkout re-prices
-- server-side and never trusts cart contents).
-- Idempotent: safe to re-run.
-- ==============================================================================

BEGIN;

-- 1. Drop constraints that pin cart_items to the legacy tables.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_variant_id_fkey'
  ) THEN
    ALTER TABLE cart_items DROP CONSTRAINT cart_items_variant_id_fkey;
    RAISE NOTICE 'Dropped legacy cart_items.variant_id FK (product_variants)';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_product_id_fkey'
  ) THEN
    ALTER TABLE cart_items DROP CONSTRAINT cart_items_product_id_fkey;
    RAISE NOTICE 'Dropped legacy cart_items.product_id FK (products)';
  END IF;
END $$;

-- Also drop the legacy composite unique constraint if present.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_cart_items'
  ) THEN
    ALTER TABLE cart_items DROP CONSTRAINT uq_cart_items;
    RAISE NOTICE 'Dropped legacy unique constraint uq_cart_items';
  END IF;
END $$;

-- 2. Remove cart rows that reference ids which no longer resolve to
--    catalog products / offer variants. Carts are ephemeral state; stale
--    rows would violate the new FKs below.
DELETE FROM cart_items ci
WHERE ci.product_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM catalog_products cp WHERE cp.id = ci.product_id);

DELETE FROM cart_items ci
WHERE ci.variant_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM offer_variants ov WHERE ov.id = ci.variant_id);

-- 3. Retarget the FKs to the catalog model. variant_id becomes nullable
--    (single-variant offers store NULL) matching the API's usage.
ALTER TABLE cart_items
  ALTER COLUMN variant_id DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_product_id_fkey'
  ) THEN
    ALTER TABLE cart_items
      ADD CONSTRAINT cart_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE;
    RAISE NOTICE 'cart_items.product_id FK retargeted to catalog_products';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_variant_id_fkey'
  ) THEN
    ALTER TABLE cart_items
      ADD CONSTRAINT cart_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES offer_variants(id) ON DELETE CASCADE;
    RAISE NOTICE 'cart_items.variant_id FK retargeted to offer_variants';
  END IF;
END $$;

-- 4. Unique constraint matching the API's upsert semantics
--    (one row per cart + variant; NULL variant allows only one row per
--    product via the COALESCE expression index).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_cart_product_variant
  ON cart_items (cart_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::text));

-- 5. Index for the embedded join used by cart.service.ts.
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);

COMMIT;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('054_fix_cart_items_schema_drift', NOW())
ON CONFLICT (version) DO NOTHING;
