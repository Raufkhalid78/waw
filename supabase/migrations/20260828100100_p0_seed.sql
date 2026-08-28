-- ============================================================================
-- WAW COMMERCE SEED DATA (IDEMPOTENT & PRODUCTION-SAFE)
-- ============================================================================

-- 1. Ensure system profile exists for store ownership
-- Uses a DO block so we handle both id AND email unique constraints safely.
-- If a profile with this email already exists (different id), we elevate its role.
-- If no profile with this email exists, we insert one.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE email = 'system@waw.com.pk') THEN
        UPDATE public.profiles
        SET role = 'ADMIN', is_whatsapp_verified = true, full_name = 'WAW System Admin'
        WHERE email = 'system@waw.com.pk';
    ELSE
        INSERT INTO public.profiles (id, full_name, phone, email, role, is_whatsapp_verified)
        VALUES ('profile_sys_admin', 'WAW System Admin', '+923000000000', 'system@waw.com.pk', 'ADMIN', true)
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, is_whatsapp_verified = true;
    END IF;
END $$;

-- 2. Ensure default categories exist if not already present, handling slug conflicts safely
INSERT INTO public.categories (id, name, name_urdu, slug, is_active) VALUES
('cat_electronics', 'Mobiles & Tech', 'موبائل اور ٹیک', 'mobiles-tech', true),
('cat_shoes', 'Shoes & Footwear', 'جوتے اور پشاوری چپل', 'shoes-footwear', true)
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    name_urdu = EXCLUDED.name_urdu,
    is_active = true;

-- 3. Ensure default store exists with valid owner_id
INSERT INTO public.stores (id, owner_id, name, slug, city, rating_average, seller_type, commission_rate_percentage, status, is_verified) VALUES
(
    'store_1', 
    COALESCE(
        (SELECT id FROM public.profiles WHERE email = 'system@waw.com.pk' LIMIT 1),
        (SELECT id FROM public.profiles WHERE role IN ('ADMIN', 'SELLER') ORDER BY created_at ASC LIMIT 1)
    ), 
    'Waw Official Retail', 
    'waw-official', 
    'Lahore', 
    4.9, 
    'FIRST_PARTY', 
    10, 
    'ACTIVE', 
    true
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    city = EXCLUDED.city,
    status = 'ACTIVE',
    is_verified = true;

-- 4. Seed Master Catalog dynamically referencing live category IDs
INSERT INTO public.catalog_products (id, category_id, title, title_urdu, slug, description, images, thumbnail, is_active) VALUES
(
    'cat_prod_1', 
    COALESCE((SELECT id FROM public.categories WHERE slug = 'mobiles-tech' LIMIT 1), 'cat_electronics'), 
    'Apple AirPods Pro 2nd Gen (ANC)', 
    'ایپل ایئر پوڈز پرو 2nd Gen', 
    'airpods-pro-2', 
    'Premium true wireless earbuds with Active Noise Cancellation.', 
    '{"https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800"}', 
    'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400', 
    true
),
(
    'cat_prod_2', 
    COALESCE((SELECT id FROM public.categories WHERE slug = 'shoes-footwear' OR slug = 'traditional-clothing' LIMIT 1), (SELECT id FROM public.categories LIMIT 1)), 
    'Premium Norozi Peshawari Chappal', 
    'پریمیم نوروزی پشاوری چپل', 
    'norozi-chappal', 
    'Handmade leather Peshawari chappal with double tyre sole.', 
    '{"https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800"}', 
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400', 
    true
)
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    title_urdu = EXCLUDED.title_urdu,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    images = EXCLUDED.images,
    thumbnail = EXCLUDED.thumbnail,
    is_active = true;

-- 5. Seed Offers dynamically referencing the store
INSERT INTO public.seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, condition, status) VALUES
(
    'offer_1', 
    'cat_prod_1', 
    COALESCE((SELECT id FROM public.stores WHERE slug = 'waw-official' LIMIT 1), (SELECT id FROM public.stores LIMIT 1), 'store_1'), 
    'SKU-AIRPODS-1', 
    65000, 
    70000, 
    'NEW', 
    'ACTIVE'
),
(
    'offer_2', 
    'cat_prod_2', 
    COALESCE((SELECT id FROM public.stores WHERE slug = 'waw-official' LIMIT 1), (SELECT id FROM public.stores LIMIT 1), 'store_1'), 
    'SKU-NOROZI-1', 
    3500, 
    4500, 
    'NEW', 
    'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET 
    price_pkr = EXCLUDED.price_pkr,
    original_price_pkr = EXCLUDED.original_price_pkr,
    status = 'ACTIVE';

-- 6. Seed Variants
INSERT INTO public.offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES
('var_1', 'offer_1', 'Default', 0),
('var_2', 'offer_2', 'Size 42', 0)
ON CONFLICT (id) DO UPDATE SET 
    variant_name = EXCLUDED.variant_name,
    price_adjustment_pkr = EXCLUDED.price_adjustment_pkr;

-- 7. Seed Inventory Ledger
INSERT INTO public.inventory_ledger (id, offer_variant_id, store_id, transaction_type, quantity, notes) VALUES
(
    'inv_seed_1', 
    'var_1', 
    COALESCE((SELECT id FROM public.stores WHERE slug = 'waw-official' LIMIT 1), (SELECT id FROM public.stores LIMIT 1), 'store_1'), 
    'RESTOCK', 
    50, 
    'Initial seed stock'
),
(
    'inv_seed_2', 
    'var_2', 
    COALESCE((SELECT id FROM public.stores WHERE slug = 'waw-official' LIMIT 1), (SELECT id FROM public.stores LIMIT 1), 'store_1'), 
    'RESTOCK', 
    20, 
    'Initial seed stock'
)
ON CONFLICT (id) DO NOTHING;
