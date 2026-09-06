-- ============================================================================
-- P0-PHASEA-T1: Add GST to Orders (18%)
-- Legally required in Pakistan. Adds gst_pkr to orders and store_orders.
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_pkr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS gst_pkr INTEGER NOT NULL DEFAULT 0;

INSERT INTO schema_migrations (version, applied_at) VALUES ('028_add_gst_to_orders', NOW()) ON CONFLICT DO NOTHING;
