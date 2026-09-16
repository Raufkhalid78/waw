-- ============================================================================
-- Migration 056: Audit remediation — stock sync, ban enforcement, suspension
-- ============================================================================
-- Fixes from the 2026-09-14 QA/security audit:
--
--   1. offer_variants.stock_quantity drift: the denormalized column (added in
--      047, backfilled once) is read by the storefront products API and the
--      cart stock checks, but nothing maintained it — every variant product
--      rendered "Out of Stock" and drifted as the ledger changed. A trigger
--      now recomputes it from the double-entry ledger on every write.
--
--   2. Self-unban via profiles UPDATE: the 049 trigger only guarded `role`,
--      but the "Users can update own profile" policy still let row owners set
--      is_banned = false / is_active = false. Platform-controlled columns are
--      now blocked for non-service callers.
--
--   3. Flash-sale items FK consistency (variant ids are offer_variants ids).
-- ============================================================================

BEGIN;

-- -
-- 1. Keep offer_variants.stock_quantity in sync with the inventory ledger
-- -
-- Backfill once more (catches rows written since 047), then maintain forever.
UPDATE offer_variants ov
SET stock_quantity = GREATEST(0, COALESCE(agg.total, 0))
FROM (
  SELECT offer_variant_id, SUM(quantity) AS total
  FROM inventory_ledger
  GROUP BY offer_variant_id
) agg
WHERE agg.offer_variant_id = ov.id
  AND ov.stock_quantity <> GREATEST(0, COALESCE(agg.total, 0));

CREATE OR REPLACE FUNCTION public.sync_variant_stock_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_variant_id TEXT;
  v_total INTEGER;
BEGIN
  v_variant_id := COALESCE(NEW.offer_variant_id, OLD.offer_variant_id);
  IF v_variant_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT GREATEST(0, COALESCE(SUM(quantity), 0)) INTO v_total
  FROM inventory_ledger
  WHERE offer_variant_id = v_variant_id;

  UPDATE offer_variants
  SET stock_quantity = v_total
  WHERE id = v_variant_id
    AND stock_quantity <> v_total;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_variant_stock ON inventory_ledger;
CREATE TRIGGER trg_sync_variant_stock
  AFTER INSERT OR UPDATE OR DELETE ON inventory_ledger
  FOR EACH ROW EXECUTE FUNCTION public.sync_variant_stock_quantity();

-- -
-- 2. profiles: platform-controlled columns (ban/active flags) are service-only
-- -
-- Bans were reversible by the banned user: the 049 trigger guarded only
-- `role`, while the owner-scoped UPDATE policy still allowed writes to
-- is_banned/is_active. Both are marketplace-controlled state now.
CREATE OR REPLACE FUNCTION public.block_unprivileged_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin', 'authenticator') THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Role changes are not permitted via direct table access';
    END IF;
    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
      RAISE EXCEPTION 'Ban state can only be changed by the marketplace';
    END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Account active state can only be changed by the marketplace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- -
-- 3. flash_sale_items.variant_id: verify the offer_variants FK is present
--    (047 creates it conditionally; recreate defensively if missing)
-- -
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flash_sale_items_variant_id_fkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM flash_sale_items fsi
    LEFT JOIN offer_variants ov ON ov.id = fsi.variant_id
    WHERE ov.id IS NULL
  ) THEN
    ALTER TABLE flash_sale_items
      ADD CONSTRAINT flash_sale_items_variant_id_fkey
      FOREIGN KEY (variant_id) REFERENCES offer_variants(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('056_audit_stock_sync_and_ban_guard', NOW())
ON CONFLICT (version) DO NOTHING;
