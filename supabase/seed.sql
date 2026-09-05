-- ==============================================================================
-- WAW Database Staging Seed
-- Deterministic data for E2E testing and integration verification
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

-- 2. Create Profiles & Assign Roles
INSERT INTO public.profiles (id, full_name, role)
VALUES 
  ('00000000-0000-0000-0000-111111111111', 'Admin', 'ADMIN'),
  ('00000000-0000-0000-0000-222222222222', 'Seller One', 'SELLER'),
  ('00000000-0000-0000-0000-333333333333', 'Seller Two', 'SELLER'),
  ('00000000-0000-0000-0000-444444444444', 'Buyer One', 'BUYER'),
  ('00000000-0000-0000-0000-555555555555', 'Buyer Two', 'BUYER')
ON CONFLICT DO NOTHING;

-- 3. Create Stores
INSERT INTO public.stores (id, owner_id, name, slug, status, commission_rate)
VALUES 
  ('11111111-0000-0000-0000-000000000000', '00000000-0000-0000-0000-222222222222', 'Lahore Fashion', 'lahore-fashion', 'ACTIVE', 10),
  ('22222222-0000-0000-0000-000000000000', '00000000-0000-0000-0000-333333333333', 'Karachi Electronics', 'karachi-electronics', 'ACTIVE', 8)
ON CONFLICT DO NOTHING;

-- 4. Create Canonical Products (Placeholder IDs)
INSERT INTO public.products (id, title, slug, category_slug, is_active)
VALUES 
  ('33333333-0000-0000-0000-000000000001', 'Cotton Kurta', 'cotton-kurta', 'fashion', TRUE),
  ('33333333-0000-0000-0000-000000000002', 'Wireless Earbuds', 'wireless-earbuds', 'electronics', TRUE)
ON CONFLICT DO NOTHING;

-- 5. Create Offers and Variants
-- Offer for Kurta
INSERT INTO public.offers (id, product_id, store_id, price_pkr, status)
VALUES 
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000000', 1500, 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Variant for Kurta (Size M)
INSERT INTO public.offer_variants (id, offer_id, sku, price_pkr)
VALUES 
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'KURTA-M', 1500)
ON CONFLICT DO NOTHING;

-- 6. Setup Inventory Snapshots
INSERT INTO public.inventory_snapshots (offer_variant_id, store_id, on_hand, reserved, version)
VALUES 
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000000', 10, 0, 1)
ON CONFLICT DO NOTHING;
