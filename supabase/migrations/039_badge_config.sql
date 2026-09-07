-- Migration 039: Badge & discovery configuration
-- Seeds admin-configurable thresholds for product badges and best sellers.

INSERT INTO marketplace_settings (key, value, description) VALUES
  ('discount_tier_1_threshold', '30', 'Minimum discount % for tier 1 Waw Deal badge'),
  ('discount_tier_2_threshold', '40', 'Minimum discount % for tier 2 Hot Deal badge'),
  ('discount_tier_3_threshold', '45', 'Minimum discount % for tier 3 Mega Deal badge'),
  ('best_seller_days', '30', 'Rolling window (days) for best seller calculation'),
  ('best_seller_limit', '20', 'Number of products that qualify as best sellers'),
  ('new_arrival_days', '14', 'Number of days a product is considered new arrival')
ON CONFLICT (key) DO NOTHING;

INSERT INTO schema_migrations (version, applied_at) VALUES ('039_badge_config', NOW()) ON CONFLICT DO NOTHING;
