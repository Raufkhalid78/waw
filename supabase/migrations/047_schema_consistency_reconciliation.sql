-- ============================================================================
-- Migration 047: Schema consistency reconciliation
-- ============================================================================
-- Resolves every contradiction found in the full audit of migrations 001-046
-- vs what the API (apps/api), web, admin, seller and mobile apps actually use:
--
--   * payouts.provider_transfer_id / payment_method — written by
--     payout-settlement.service.ts and settle_payout_atomic (023), never created.
--   * stores.subscription_plan / subscription_active — written/read by
--     subscription.service.ts, ai.controller.ts, product.service.ts; only
--     subscription_expires_at was ever added (015).
--   * offer_variants.stock_quantity — read by cart.service.ts (stock checks);
--     the canonical 001 offer_variants has no stock column (stock lives in
--     inventory_ledger). Kept as a denormalized convenience column maintained
--     by the API's ledger writes.
--   * shipments.courier_provider is NOT NULL in 001 — but both the API
--     (order.controller.ts) and 043's BOOKING_PENDING sweep insert shipments
--     without it. Made nullable with POSTEX default.
--   * flash_sale_items.variant_id must accept offer_variants.id (the API's
--     variant identifiers are offer-variant ids) — FK retarget + fallback FK.
--   * UserRole enum missing SUPER_ADMIN / OPS_AGENT / FINANCE / MODERATOR used
--     by the API's require-role middleware and admin service.
--   * PaymentStatus enum missing AWAITING_COD_REMITTANCE / SETTLED used by
--     xpay/cod-remittance services (orders.payment_status is TEXT but the
--     payments.status column is enum-typed in 001).
--   * payments.payment_method is enum "PaymentMethod" in 001 but the API
--     inserts 'RAAST' (raast.service) — converted to TEXT.
--   * orders.payment_status / global_status CHECK-free TEXT already — OK.
--   * reviews.product_id FK targets legacy products; the API writes catalog
--     product ids into it (reviews.controller, product.service) — retarget to
--     catalog_products.
--   * order_items.product_id FK targets legacy products; the checkout RPCs
--     insert catalog product ids — retarget to catalog_products.
--   * wishlists/cart_items product semantics — wishlists.product_id already
--     retargeted in 003 (catalog_products); cart_items.product_id holds
--     catalog product ids too — retarget FK.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Enum additions — MUST run outside a transaction block
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'OPS_AGENT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'AWAITING_COD_REMITTANCE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SETTLED';
ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'SETTLED';

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. payouts: provider columns used by settle_payout_atomic + settlement service
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS provider_transfer_id TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS provider_payload_hash TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD';

-- payout settlement writes 'SETTLED' (see 023 RPC + PayoutStatus API enum)
-- payouts.status is TEXT in 001 — no enum conflict, just documenting values:
-- SCHEDULED / PROCESSING / SETTLED / COMPLETED / PAID / HELD / HELD_PENDING_DELIVERY / FAILED

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. stores: subscription columns used across the API (015 adds only expires_at)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. offer_variants: denormalized stock column read by cart.service.ts
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE offer_variants ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

-- Backfill from inventory ledger so existing variants show correct stock
UPDATE offer_variants ov
SET stock_quantity = GREATEST(0, COALESCE(agg.total, 0))
FROM (
  SELECT offer_variant_id, SUM(quantity) AS total
  FROM inventory_ledger
  GROUP BY offer_variant_id
) agg
WHERE agg.offer_variant_id = ov.id
  AND ov.stock_quantity = 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. shipments: courier_provider NOT NULL breaks BOOKING_PENDING inserts
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE shipments ALTER COLUMN courier_provider DROP NOT NULL;
ALTER TABLE shipments ALTER COLUMN courier_provider SET DEFAULT 'POSTEX';
-- order.controller.ts writes 'courier_name' — 001 defines the column as
-- 'courier'. Add the alias so both names resolve.
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS courier_name TEXT;
-- keep the two in sync
CREATE OR REPLACE FUNCTION sync_shipment_courier_names()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.courier_name IS NULL AND NEW.courier IS NOT NULL THEN
    NEW.courier_name := NEW.courier;
  ELSIF NEW.courier IS NULL AND NEW.courier_name IS NOT NULL THEN
    NEW.courier := NEW.courier_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_shipment_courier_names ON shipments;
CREATE TRIGGER trg_sync_shipment_courier_names
  BEFORE INSERT OR UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION sync_shipment_courier_names();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. flash_sale_items.variant_id: API variant ids are offer_variants.id
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flash_sale_items_variant_id_fkey'
  ) THEN
    ALTER TABLE flash_sale_items DROP CONSTRAINT flash_sale_items_variant_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  -- Retarget when every existing row references an offer variant
  IF NOT EXISTS (
    SELECT 1 FROM flash_sale_items fsi
    LEFT JOIN offer_variants ov ON ov.id = fsi.variant_id
    WHERE ov.id IS NULL
  ) THEN
    ALTER TABLE flash_sale_items
      ADD CONSTRAINT flash_sale_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES offer_variants(id) ON DELETE CASCADE;
  ELSE
    -- Mixed legacy data: keep a permissive FK to product_variants if possible,
    -- otherwise leave unenforced for manual cleanup
    BEGIN
      ALTER TABLE flash_sale_items
        ADD CONSTRAINT flash_sale_items_variant_id_fkey
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. UserRole / PaymentStatus enums: handled in section 0 at the top of this
--    file (ALTER TYPE ... ADD VALUE must run outside a transaction block).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. payments.payment_method: API inserts 'RAAST' / 'XPAY_WALLET' / 'JAZZCASH'
--    values that are not in the "PaymentMethod" enum — convert to TEXT.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'payments' AND column_name = 'payment_method';

  IF col_type = 'USER-DEFINED' THEN
    ALTER TABLE payments ALTER COLUMN payment_method TYPE TEXT USING payment_method::TEXT;
    RAISE NOTICE 'Converted payments.payment_method enum -> TEXT';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. reviews / order_items / cart_items .product_id: API writes catalog ids
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_product_id_fkey'
  ) THEN
    ALTER TABLE reviews DROP CONSTRAINT reviews_product_id_fkey;
  END IF;
END $$;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_id_fkey'
  ) THEN
    ALTER TABLE order_items DROP CONSTRAINT order_items_product_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  -- order_items rows may reference legacy products rows (pre-catalog data);
  -- only enforce the catalog FK when all rows are catalog ids.
  IF NOT EXISTS (
    SELECT 1 FROM order_items oi
    LEFT JOIN catalog_products cp ON cp.id = oi.product_id
    WHERE cp.id IS NULL AND oi.product_id IS NOT NULL
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE RESTRICT;
    RAISE NOTICE 'order_items.product_id FK retargeted to catalog_products';
  ELSE
    RAISE NOTICE 'order_items contains legacy product ids — FK left unenforced; run catalog migration first';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_product_id_fkey'
  ) THEN
    ALTER TABLE cart_items DROP CONSTRAINT cart_items_product_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cart_items ci
    LEFT JOIN catalog_products cp ON cp.id = ci.product_id
    WHERE cp.id IS NULL
  ) THEN
    ALTER TABLE cart_items
      ADD CONSTRAINT cart_items_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE;
    RAISE NOTICE 'cart_items.product_id FK retargeted to catalog_products';
  ELSE
    RAISE NOTICE 'cart_items contains legacy product ids — FK left unenforced';
  END IF;
END $$;

COMMIT;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('047_schema_consistency_reconciliation', NOW())
ON CONFLICT (version) DO NOTHING;
