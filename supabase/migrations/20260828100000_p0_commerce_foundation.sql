-- ============================================================================
-- WAW COMMERCE FOUNDATION SCHEMA MIGRATION (IDEMPOTENT & PRODUCTION-SAFE)
-- ============================================================================

-- Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Truthful Content CMS
CREATE TABLE IF NOT EXISTS public.cms_content (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    key_slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'banner', 'policy', 'claim'
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.cms_content (key_slug, type, title, content_html, is_active) VALUES 
('buyer-protection-claim', 'claim', 'Verified Pakistani Merchants', 'Direct from verified Pakistani sellers with doorstep delivery and dedicated customer care.', true)
ON CONFLICT (key_slug) DO UPDATE SET 
    title = EXCLUDED.title,
    content_html = EXCLUDED.content_html,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 2. Destination Serviceability Engine
CREATE TABLE IF NOT EXISTS public.serviceable_cities (
    city_name TEXT PRIMARY KEY,
    province TEXT NOT NULL,
    is_cod_eligible BOOLEAN DEFAULT true,
    supported_couriers TEXT[] DEFAULT '{"POSTEX"}',
    estimated_delivery_days_min INTEGER DEFAULT 2,
    estimated_delivery_days_max INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO public.serviceable_cities (city_name, province, is_cod_eligible, is_active) VALUES 
('Lahore', 'Punjab', true, true),
('Karachi', 'Sindh', true, true),
('Islamabad', 'Federal', true, true),
('Rawalpindi', 'Punjab', true, true),
('Faisalabad', 'Punjab', true, true),
('Multan', 'Punjab', true, true),
('Peshawar', 'KPK', true, true),
('Quetta', 'Balochistan', true, true)
ON CONFLICT (city_name) DO UPDATE SET 
    province = EXCLUDED.province,
    is_cod_eligible = EXCLUDED.is_cod_eligible,
    is_active = EXCLUDED.is_active;

-- 3. Product / Offer / Inventory Separation

-- Master Catalog Products
CREATE TABLE IF NOT EXISTS public.catalog_products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    title_urdu TEXT,
    slug TEXT UNIQUE NOT NULL,
    brand TEXT,
    description TEXT,
    attributes JSONB DEFAULT '{}'::jsonb,
    images TEXT[] NOT NULL DEFAULT '{}',
    thumbnail TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seller Offers (Listings)
CREATE TABLE IF NOT EXISTS public.seller_offers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    catalog_product_id TEXT NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    price_pkr INTEGER NOT NULL,
    original_price_pkr INTEGER,
    condition TEXT DEFAULT 'NEW',
    is_express BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'ACTIVE', -- 'PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(store_id, sku)
);

-- Offer Variants
CREATE TABLE IF NOT EXISTS public.offer_variants (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    offer_id TEXT NOT NULL REFERENCES public.seller_offers(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL, -- e.g., 'Standard', 'Size 10', 'Red'
    price_adjustment_pkr INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Ledger (Double-Entry Balance Tracking)
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    offer_variant_id TEXT NOT NULL REFERENCES public.offer_variants(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'RESTOCK', 'RESERVE', 'RELEASE', 'DISPATCH'
    quantity INTEGER NOT NULL,
    reference_id TEXT, -- e.g. order_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    order_number TEXT UNIQUE,
    buyer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL REFERENCES public.serviceable_cities(city_name) ON DELETE RESTRICT,
    total_amount_pkr INTEGER NOT NULL,
    payment_method TEXT NOT NULL, -- 'COD', 'CARD', 'RAAST'
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    global_status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Orders (Sub-orders per seller)
CREATE TABLE IF NOT EXISTS public.store_orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    order_number TEXT UNIQUE NOT NULL,
    subtotal_pkr INTEGER NOT NULL,
    commission_pkr INTEGER NOT NULL,
    seller_payout_pkr INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    tracking_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    store_order_id TEXT NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
    offer_variant_id TEXT NOT NULL REFERENCES public.offer_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    price_pkr INTEGER NOT NULL,
    product_title TEXT NOT NULL,
    variant_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Transactional Outbox
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'FAILED'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Financial Ledger
CREATE TABLE IF NOT EXISTS public.financial_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL, -- 'SALE', 'COMMISSION', 'PAYOUT', 'REFUND'
    amount_pkr INTEGER NOT NULL,
    entry_type TEXT NOT NULL, -- 'CREDIT', 'DEBIT'
    reference_id TEXT, -- store_order_id or payout_id
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    amount_pkr INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'PROCESSING', 'COMPLETED'
    bank_reference TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PERMISSIONS & ROLES GRANT (PREVENTS PERMISSION DENIED 500 REGRESSIONS)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Public catalog & configuration read permissions
GRANT SELECT ON TABLE public.catalog_products TO anon, authenticated;
GRANT SELECT ON TABLE public.seller_offers TO anon, authenticated;
GRANT SELECT ON TABLE public.offer_variants TO anon, authenticated;
GRANT SELECT ON TABLE public.cms_content TO anon, authenticated;
GRANT SELECT ON TABLE public.serviceable_cities TO anon, authenticated;
GRANT SELECT ON TABLE public.categories TO anon, authenticated;
GRANT SELECT ON TABLE public.stores TO anon, authenticated;

-- Authenticated buyer/seller permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.store_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.order_items TO authenticated;
GRANT SELECT, INSERT ON TABLE public.inventory_ledger TO authenticated;

-- Allow anon order checkout creation for guest checkout if enabled
GRANT SELECT, INSERT ON TABLE public.orders TO anon;
GRANT SELECT, INSERT ON TABLE public.store_orders TO anon;
GRANT SELECT, INSERT ON TABLE public.order_items TO anon;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviceable_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to ensure idempotence
DROP POLICY IF EXISTS "Public can view active catalog products" ON public.catalog_products;
DROP POLICY IF EXISTS "Public can view active seller offers" ON public.seller_offers;
DROP POLICY IF EXISTS "Public can view offer variants" ON public.offer_variants;
DROP POLICY IF EXISTS "Public can view active cms content" ON public.cms_content;
DROP POLICY IF EXISTS "Public can view active serviceable cities" ON public.serviceable_cities;
DROP POLICY IF EXISTS "Buyers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can view store orders" ON public.store_orders;
DROP POLICY IF EXISTS "Store owners can view payouts" ON public.payouts;
DROP POLICY IF EXISTS "Store owners can view financial ledger" ON public.financial_ledger;

-- Create robust policies
CREATE POLICY "Public can view active catalog products" ON public.catalog_products 
    FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY "Public can view active seller offers" ON public.seller_offers 
    FOR SELECT USING (status = 'ACTIVE' OR auth.role() = 'service_role');

CREATE POLICY "Public can view offer variants" ON public.offer_variants 
    FOR SELECT USING (true);

CREATE POLICY "Public can view active cms content" ON public.cms_content 
    FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY "Public can view active serviceable cities" ON public.serviceable_cities 
    FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

CREATE POLICY "Buyers can view own orders" ON public.orders 
    FOR SELECT USING (buyer_id = auth.uid()::TEXT OR auth.role() = 'service_role');

CREATE POLICY "Store owners can view store orders" ON public.store_orders 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_orders.store_id AND stores.owner_id = auth.uid()::TEXT)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Store owners can view payouts" ON public.payouts 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.stores WHERE stores.id = payouts.store_id AND stores.owner_id = auth.uid()::TEXT)
        OR auth.role() = 'service_role'
    );

CREATE POLICY "Store owners can view financial ledger" ON public.financial_ledger 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.stores WHERE stores.id = financial_ledger.store_id AND stores.owner_id = auth.uid()::TEXT)
        OR auth.role() = 'service_role'
    );
