-- ============================================================================
-- P0-PHASE3-T2: Inventory Constraints
-- Ensures reserved stock can never exceed on-hand stock and that quantities
-- are never negative.
-- ============================================================================

ALTER TABLE inventory_snapshots 
  ADD CONSTRAINT chk_reserved_le_on_hand CHECK (reserved <= on_hand),
  ADD CONSTRAINT chk_on_hand_positive CHECK (on_hand >= 0),
  ADD CONSTRAINT chk_reserved_positive CHECK (reserved >= 0);

INSERT INTO schema_migrations (version, applied_at) VALUES ('024_inventory_invariants', NOW()) ON CONFLICT DO NOTHING;
