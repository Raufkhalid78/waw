-- ============================================================================
-- Migration 038: Marketplace settings key reconciliation
--
-- The admin Settings page historically wrote legacy keys
--   free_delivery_threshold / default_shipping_fee / cod_fee
-- while the checkout RPCs and GET /api/marketplace-config read the canonical
-- keys seeded by migration 034:
--   free_delivery_threshold_pkr / default_shipping_fee_pkr / cod_handling_fee_pkr
-- Result: editing admin pricing had NO effect on checkout.
--
-- Fix: copy any legacy-key values into the canonical keys (only where the
-- canonical key is absent), then drop the legacy keys so there is exactly
-- one source of truth. The admin UI is updated in code to write canonical keys.
-- ============================================================================

-- 1. Sync legacy -> canonical (only when canonical is missing)
INSERT INTO marketplace_settings (key, value, description)
SELECT 'free_delivery_threshold_pkr', value, 'Minimum order amount for free delivery (synced from legacy key)'
FROM marketplace_settings WHERE key = 'free_delivery_threshold'
  AND NOT EXISTS (SELECT 1 FROM marketplace_settings WHERE key = 'free_delivery_threshold_pkr');

INSERT INTO marketplace_settings (key, value, description)
SELECT 'default_shipping_fee_pkr', value, 'Default shipping fee in PKR (synced from legacy key)'
FROM marketplace_settings WHERE key = 'default_shipping_fee'
  AND NOT EXISTS (SELECT 1 FROM marketplace_settings WHERE key = 'default_shipping_fee_pkr');

INSERT INTO marketplace_settings (key, value, description)
SELECT 'cod_handling_fee_pkr', value, 'Cash on Delivery handling fee (synced from legacy key)'
FROM marketplace_settings WHERE key = 'cod_fee'
  AND NOT EXISTS (SELECT 1 FROM marketplace_settings WHERE key = 'cod_handling_fee_pkr');

-- 2. Remove legacy keys — canonical keys are the single source of truth
DELETE FROM marketplace_settings WHERE key IN ('free_delivery_threshold', 'default_shipping_fee', 'cod_fee');

-- 3. Guarantee all revenue-critical keys exist with sane defaults
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('free_delivery_threshold_pkr', '5000', 'Minimum order amount for free delivery'),
  ('default_shipping_fee_pkr', '200', 'Default shipping fee in PKR'),
  ('cod_handling_fee_pkr', '100', 'Cash on Delivery handling fee'),
  ('gst_rate_percentage', '18', 'General Sales Tax rate'),
  ('default_commission_pct', '10', 'Default seller commission percentage (fallback when no category/store rate applies)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO schema_migrations (version, applied_at) VALUES ('038_settings_key_reconciliation', NOW()) ON CONFLICT DO NOTHING;
