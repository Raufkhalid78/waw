-- ============================================================================
-- WAW MARKETPLACE — CLEANUP SEED DATA
-- ============================================================================
-- Run this to remove ALL demo/seed data while preserving the schema.
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- ── 1. Remove demo inventory ledger entries ──────────────────────────────────
DELETE FROM inventory_ledger WHERE notes LIKE '%Initial demo stock%';

-- ── 2. Remove demo offer variants ───────────────────────────────────────────
DELETE FROM offer_variants WHERE id LIKE 'var-%';

-- ── 3. Remove demo seller offers ────────────────────────────────────────────
DELETE FROM seller_offers WHERE id LIKE 'off-%';

-- ── 4. Remove demo catalog products ─────────────────────────────────────────
DELETE FROM catalog_products WHERE id LIKE 'cpd-%';

-- ── 5. Remove demo stores ───────────────────────────────────────────────────
DELETE FROM stores WHERE id LIKE 'store-%';

-- ── 6. Remove demo coupons ──────────────────────────────────────────────────
DELETE FROM coupons WHERE id LIKE 'coupon-demo-%';

-- ── 7. Remove demo campaigns ────────────────────────────────────────────────
DELETE FROM campaigns WHERE campaign_type = 'PROMO_STRIP';

-- ── 8. Remove demo search suggestions ───────────────────────────────────────
DELETE FROM search_suggestions;

-- ── 9. Remove demo CMS content ──────────────────────────────────────────────
DELETE FROM cms_content WHERE key_slug = 'buyer-protection-claim';

-- ── 10. Remove demo marketplace settings ────────────────────────────────────
DELETE FROM marketplace_settings;

-- ── 11. Remove demo serviceable cities ──────────────────────────────────────
DELETE FROM serviceable_cities;

-- ── 12. Remove demo categories ──────────────────────────────────────────────
DELETE FROM categories WHERE id LIKE 'cat_%';

-- ── 13. Remove demo profiles (keep system admin) ────────────────────────────
DELETE FROM profiles WHERE id != '00000000-0000-0000-0000-000000000000' AND email LIKE '%@waw.com.pk';

-- ── 14. Remove system admin auth user ───────────────────────────────────────
-- Uncomment the line below to ALSO remove the admin auth user (requires service_role):
-- DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- ── 15. Remove migration ledger entries ─────────────────────────────────────
DELETE FROM schema_migrations;

-- ============================================================================
-- CLEANUP COMPLETE
-- Database schema is intact. All demo data has been removed.
-- To re-seed, run SEED_DATA.sql again.
-- ============================================================================
