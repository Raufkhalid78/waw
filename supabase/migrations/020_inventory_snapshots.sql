-- ============================================================================
-- P0-PHASE0-T1: Authoritative Inventory Snapshots
-- Provides a single deterministic row per offer_variant that the checkout RPC
-- locks with SELECT ... FOR UPDATE. Eliminates the zero-stock race window
-- where aggregating an empty inventory_ledger returns 0 rows and locks nothing.
--
-- Design:
--   on_hand  = total physical units (RESTOCK + RETURN_RESTOCK + RELEASE + SALE adjustments)
--   reserved = units held by pending checkouts
--   available= on_hand - reserved  (generated stored column)
--   version  = monotonically increasing optimistic-lock counter
-- ============================================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  offer_variant_id  TEXT        NOT NULL PRIMARY KEY
                               REFERENCES offer_variants(id) ON DELETE CASCADE,
  store_id          TEXT        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  on_hand           INTEGER     NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved          INTEGER     NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available         INTEGER     GENERATED ALWAYS AS (on_hand - reserved) STORED,
  version           BIGINT      NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE inventory_snapshots IS
  'Authoritative per-variant inventory balance. Locked FOR UPDATE by checkout RPC.';

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_inv_snapshots_store
  ON inventory_snapshots (store_id);

CREATE INDEX IF NOT EXISTS idx_inv_snapshots_available
  ON inventory_snapshots (offer_variant_id, available);

-- 3. updated_at trigger
CREATE OR REPLACE FUNCTION update_inventory_snapshot_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inv_snapshots_updated_at ON inventory_snapshots;
CREATE TRIGGER trg_inv_snapshots_updated_at
  BEFORE UPDATE ON inventory_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_inventory_snapshot_updated_at();

-- 4. RLS
ALTER TABLE inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon inventory_snapshots read"
  ON inventory_snapshots FOR SELECT TO anon USING (false);

CREATE POLICY "Store owners can view their inventory snapshots"
  ON inventory_snapshots FOR SELECT TO authenticated
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::TEXT)
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Service role full access inventory_snapshots"
  ON inventory_snapshots FOR ALL TO service_role USING (true);

-- 5. Grants
GRANT SELECT ON inventory_snapshots TO authenticated;
GRANT ALL    ON inventory_snapshots TO service_role;

-- 6. Backfill from existing ledger (idempotent)
INSERT INTO inventory_snapshots (offer_variant_id, store_id, on_hand, reserved)
SELECT
  il.offer_variant_id,
  il.store_id,
  GREATEST(0, COALESCE(SUM(
    CASE
      WHEN il.transaction_type IN ('RESTOCK', 'RETURN_RESTOCK', 'RELEASE') THEN il.quantity
      WHEN il.transaction_type IN ('SALE', 'DAMAGE_ADJUSTMENT')            THEN il.quantity
      ELSE 0
    END
  ), 0)) AS on_hand,
  GREATEST(0, COALESCE(ABS(SUM(
    CASE WHEN il.transaction_type = 'RESERVE' THEN il.quantity ELSE 0 END
  )), 0)) AS reserved
FROM inventory_ledger il
GROUP BY il.offer_variant_id, il.store_id
ON CONFLICT (offer_variant_id)
DO UPDATE SET
  on_hand    = EXCLUDED.on_hand,
  reserved   = EXCLUDED.reserved,
  version    = inventory_snapshots.version + 1,
  updated_at = NOW();

-- 7. Helper: ensure a snapshot row exists (used by checkout RPC before locking)
CREATE OR REPLACE FUNCTION ensure_inventory_snapshot(
  p_offer_variant_id TEXT,
  p_store_id         TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO inventory_snapshots (offer_variant_id, store_id, on_hand, reserved)
  VALUES (p_offer_variant_id, p_store_id, 0, 0)
  ON CONFLICT (offer_variant_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_inventory_snapshot(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION ensure_inventory_snapshot(TEXT, TEXT) TO authenticated;

-- 8. Record migration
INSERT INTO schema_migrations (version, applied_at)
VALUES ('020_inventory_snapshots', NOW())
ON CONFLICT (version) DO NOTHING;
