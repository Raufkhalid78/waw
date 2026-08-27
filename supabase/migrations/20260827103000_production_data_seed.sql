-- ==============================================================================
-- WAW PRODUCTION MIGRATION LEDGER & SEED SCRIPT
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Create Migration Ledger (Step 1)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Register previous unversioned schemas as applied
INSERT INTO schema_migrations (version) VALUES ('00_baseline_schema') ON CONFLICT DO NOTHING;
INSERT INTO schema_migrations (version) VALUES ('01_config_campaigns') ON CONFLICT DO NOTHING;

-- 2. Ensure Permissions (Step 2)
-- The API uses service_role. It MUST have SELECT/INSERT/UPDATE/DELETE on these tables.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Allow anonymous access where RLS permits it
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
-- (Note: Broad grants were revoked in a subsequent migration 20260827130000_audit_fixes)

-- 3. Cleanup Existing Mock/Conflicting Data
-- Removed destructive DELETE statements to preserve production data safely.


-- 4. Seed Managed Metadata: Categories (Step 3)
INSERT INTO categories (id, name, name_urdu, slug, parent_id, sort_order, is_active, image_url, description) VALUES
('cat-100', 'Mobiles & Tech', 'موبائل اور ٹیک', 'mobiles-tech', NULL, 1, true, NULL, 'Smartphones, gadgets, and accessories'),
('cat-101', 'Fashion', 'فیشن', 'fashion', NULL, 2, true, NULL, 'Clothing, lawn collections, and footwear'),
('cat-102', 'Beauty & Fragrance', 'خوبصورتی اور عطر', 'beauty-fragrance', NULL, 3, true, NULL, 'Perfumes, attar, and cosmetics')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_urdu = EXCLUDED.name_urdu, slug = EXCLUDED.slug, sort_order = EXCLUDED.sort_order, description = EXCLUDED.description;

INSERT INTO categories (id, name, name_urdu, slug, parent_id, sort_order, is_active) VALUES
('cat-101-1', 'Lawn 2026', 'لان 2026', 'lawn-2026', 'cat-101', 1, true),
('cat-101-2', 'Peshawari Chappal', 'پشاوری چپل', 'peshawari-chappal', 'cat-101', 2, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- 5. Seed Managed Metadata: Configs (Step 3)
INSERT INTO serviceability_locations (id, city_name, city_name_urdu, is_active, estimated_days) VALUES
('loc-1', 'Lahore', 'لاہور', true, 2),
('loc-2', 'Karachi', 'کراچی', true, 3),
('loc-3', 'Islamabad', 'اسلام آباد', true, 2)
ON CONFLICT (id) DO UPDATE SET estimated_days = EXCLUDED.estimated_days;

INSERT INTO search_suggestions (id, term, score, is_active) VALUES
('ss-1', 'Khaadi Lawn 2026', 100, true),
('ss-2', 'Peshawari Chappal', 90, true),
('ss-3', 'AirPods Pro ANC', 85, true)
ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score;

INSERT INTO campaigns (id, tag, title, link_url, link_text, campaign_type, sort_order) VALUES
('camp-1', '⚡ MEGA DEALS', 'Azadi Celebration: Up to 50% OFF with voucher AZADI2026 at checkout!', '/category/mobiles-tech', 'Shop Deals', 'PROMO_STRIP', 1),
('camp-2', '🚚 FREE DELIVERY', 'Zero shipping charges on all orders above PKR 5,000 nationwide across Pakistan.', '/cart', 'Learn More', 'PROMO_STRIP', 2)
ON CONFLICT (id) DO UPDATE SET tag = EXCLUDED.tag, title = EXCLUDED.title, link_url = EXCLUDED.link_url, sort_order = EXCLUDED.sort_order;

-- 6. Seed Real Commerce Data (Step 4)

DO $$
DECLARE
    sys_user_id TEXT := '00000000-0000-0000-0000-000000000000';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = sys_user_id::uuid) THEN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
        VALUES (sys_user_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'system@waw.com.pk', '', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = sys_user_id) THEN
        INSERT INTO profiles (id, full_name, phone, email, role, is_whatsapp_verified)
        VALUES (sys_user_id, 'WAW System Admin', '+920000000000', 'system@waw.com.pk', 'ADMIN', true);
    END IF;

    -- Store 1
    INSERT INTO stores (id, owner_id, name, slug, seller_type, status, city, address) 
    VALUES ('store-100', sys_user_id, 'Waw Flagship Store', 'waw-flagship', 'FIRST_PARTY', 'ACTIVE', 'Lahore', 'HQ')
    ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

    -- Store 2
    INSERT INTO stores (id, owner_id, name, slug, seller_type, status, city, address) 
    VALUES ('store-101', sys_user_id, 'Peshawar Heritage', 'peshawar-heritage', 'THIRD_PARTY', 'ACTIVE', 'Peshawar', 'Bazaar')
    ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

    -- Real Products
    INSERT INTO products (id, store_id, category_id, title, title_urdu, slug, base_price_pkr, images, is_active, is_first_party, seller_type)
    VALUES 
    ('prod-1', 'store-100', 'cat-100', 'Apple AirPods Pro 2', 'ایپل ایئر پوڈز پرو 2', 'apple-airpods-pro-2', 65000, ARRAY['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434'], true, true, 'FIRST_PARTY'),
    ('prod-2', 'store-101', 'cat-101-2', 'Premium Leather Peshawari Chappal', 'پریمیم لیدر پشاوری چپل', 'premium-leather-peshawari-chappal', 4500, ARRAY['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a'], true, false, 'THIRD_PARTY')
    ON CONFLICT (id) DO UPDATE SET is_active = true;

    -- Product Variants (Stock)
    INSERT INTO product_variants (id, product_id, sku, stock_quantity, is_active)
    VALUES
    ('var-1', 'prod-1', 'SKU-APP-01', 50, true),
    ('var-2', 'prod-2', 'SKU-PESH-01', 120, true)
    ON CONFLICT (id) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity;

END $$;

-- Register final migration step
INSERT INTO schema_migrations (version) VALUES ('02_production_data_seed') ON CONFLICT DO NOTHING;
