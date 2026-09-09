-- ==============================================================================
-- WAW Database Staging Seed
-- Deterministic data for E2E testing and integration verification.
--
-- Seeds the RUNTIME schema (catalog_products / seller_offers / offer_variants /
-- inventory_snapshots + inventory_ledger stock). Runs AFTER all migrations
-- (CI: supabase db push, then this file). Idempotent: safe to re-run.
--
-- References categories BY SLUG so it composes with any environment where the
-- platform categories already exist (e.g. from other seeds).
-- ==============================================================================

-- 1. Create Users (Auth)
INSERT INTO auth.users (id, email, phone, encrypted_password, email_confirmed_at)
VALUES
  ('00000000-0000-0000-0000-111111111111', 'admin@waw.local', '+923000000001', 'mock_password_hash', NOW()),
  ('00000000-0000-0000-0000-222222222222', 'seller1@waw.local', '+923000000002', 'mock_password_hash', NOW()),
  ('00000000-0000-0000-0000-333333333333', 'seller2@waw.local', '+923000000003', 'mock_password_hash', NOW()),
  ('00000000-0000-0000-0000-444444444444', 'buyer1@waw.local', '+923000000004', 'mock_password_hash', NOW()),
  ('00000000-0000-0000-0000-555555555555', 'buyer2@waw.local', '+923000000005', 'mock_password_hash', NOW())
ON CONFLICT DO NOTHING;

-- 2. Profiles (phone is NOT NULL UNIQUE in the runtime schema)
INSERT INTO public.profiles (id, full_name, phone, email, role)
VALUES
  ('00000000-0000-0000-0000-111111111111', 'Admin', '+923000000001', 'admin@waw.local', 'ADMIN'),
  ('00000000-0000-0000-0000-222222222222', 'Seller One', '+923000000002', 'seller1@waw.local', 'SELLER'),
  ('00000000-0000-0000-0000-333333333333', 'Seller Two', '+923000000003', 'seller2@waw.local', 'SELLER'),
  ('00000000-0000-0000-0000-444444444444', 'Buyer One', '+923000000004', 'buyer1@waw.local', 'BUYER'),
  ('00000000-0000-0000-0000-555555555555', 'Buyer Two', '+923000000005', 'buyer2@waw.local', 'BUYER')
ON CONFLICT DO NOTHING;

-- 3. Categories referenced BY SLUG (no hard-coded category IDs)
INSERT INTO public.categories (name, slug, is_active)
VALUES
  ('E2E Fashion', 'e2e-fashion', TRUE),
  ('E2E Electronics', 'e2e-electronics', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 4. Stores (city/address NOT NULL; correct commission column)
INSERT INTO public.stores (id, owner_id, name, slug, status, commission_rate_percentage, city, address, is_verified)
VALUES
  ('11111111-0000-0000-0000-000000000000', '00000000-0000-0000-0000-222222222222', 'Lahore Fashion', 'lahore-fashion', 'ACTIVE', 10, 'Lahore', '12 Fashion Street, Gulberg III, Lahore', TRUE),
  ('22222222-0000-0000-0000-000000000000', '00000000-0000-0000-0000-333333333333', 'Karachi Electronics', 'karachi-electronics', 'ACTIVE', 8, 'Karachi', '45 Tech Avenue, Clifton, Karachi', TRUE)
ON CONFLICT DO NOTHING;

-- 5. Canonical Catalog Products (unique slugs; category resolved by slug)
INSERT INTO public.catalog_products (id, category_id, title, slug, description, is_active)
VALUES
  ('33333333-0000-0000-0000-000000000001', (SELECT id FROM public.categories WHERE slug = 'e2e-fashion'), 'E2E Cotton Kurta', 'e2e-cotton-kurta', 'Premium breathable cotton kurta', TRUE),
  ('33333333-0000-0000-0000-000000000002', (SELECT id FROM public.categories WHERE slug = 'e2e-electronics'), 'E2E Wireless Earbuds', 'e2e-wireless-earbuds', 'True wireless earbuds with charging case', TRUE)
ON CONFLICT DO NOTHING;

-- 6. Seller Offers (per-store listings — what buyers actually purchase)
INSERT INTO public.seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, status)
VALUES
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000000', 'E2E-KURTA-M', 1500, 2000, 'ACTIVE'),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000000', 'E2E-EARBUDS-V1', 3500, 4500, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- 7. Offer Variants (variant_name + price_adjustment_pkr in the runtime schema)
INSERT INTO public.offer_variants (id, offer_id, variant_name, price_adjustment_pkr)
VALUES
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'Size M', 0),
  ('55555555-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002', 'Standard', 0)
ON CONFLICT DO NOTHING;

-- 8. Inventory: snapshots are the authoritative lock balance (checkout RPC);
--    inventory_ledger carries the same stock as STOCK_IN rows because the
--    quote engine derives availability from the ledger aggregate. Both are
--    required and must agree.
INSERT INTO public.inventory_snapshots (offer_variant_id, store_id, on_hand, reserved, version)
VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000000', 10, 0, 1),
  ('55555555-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000000', 25, 0, 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes)
VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000000', 'STOCK_IN', 10, 'E2E seed opening stock'),
  ('55555555-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000000', 'STOCK_IN', 25, 'E2E seed opening stock');
