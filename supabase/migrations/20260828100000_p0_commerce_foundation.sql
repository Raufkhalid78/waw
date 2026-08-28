-- 1. Truthful Content CMS
CREATE TABLE IF NOT EXISTS cms_content (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    key_slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'banner', 'policy', 'claim'
    title TEXT NOT NULL,
    content_html TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO cms_content (key_slug, type, title, content_html) VALUES 
('buyer-protection-claim', 'claim', 'Verified Pakistani Merchants', 'Direct from verified Pakistani sellers with doorstep delivery and dedicated customer care.');

-- 2. Destination Serviceability Engine
CREATE TABLE IF NOT EXISTS serviceable_cities (
    city_name TEXT PRIMARY KEY,
    province TEXT NOT NULL,
    is_cod_eligible BOOLEAN DEFAULT true,
    supported_couriers TEXT[] DEFAULT '{"POSTEX"}',
    estimated_delivery_days_min INTEGER DEFAULT 2,
    estimated_delivery_days_max INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO serviceable_cities (city_name, province) VALUES 
('Lahore', 'Punjab'),
('Karachi', 'Sindh'),
('Islamabad', 'Federal'),
('Rawalpindi', 'Punjab'),
('Faisalabad', 'Punjab'),
('Multan', 'Punjab'),
('Peshawar', 'KPK'),
('Quetta', 'Balochistan');

-- 3. Product / Offer / Inventory Separation

-- Drop legacy tables that couple product and offer/inventory
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS store_orders CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Master Catalog
CREATE TABLE IF NOT EXISTS catalog_products (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
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
CREATE TABLE IF NOT EXISTS seller_offers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    catalog_product_id TEXT NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS offer_variants (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    offer_id TEXT NOT NULL REFERENCES seller_offers(id) ON DELETE CASCADE,
    variant_name TEXT NOT NULL, -- e.g., 'Size 10', 'Red'
    price_adjustment_pkr INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Ledger
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    offer_variant_id TEXT NOT NULL REFERENCES offer_variants(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL, -- 'RESTOCK', 'RESERVE', 'RELEASE', 'DISPATCH'
    quantity INTEGER NOT NULL,
    reference_id TEXT, -- e.g. order_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    buyer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city TEXT NOT NULL REFERENCES serviceable_cities(city_name) ON DELETE RESTRICT,
    total_amount_pkr INTEGER NOT NULL,
    payment_method TEXT NOT NULL, -- 'COD', 'CARD', 'RAAST'
    payment_status TEXT NOT NULL DEFAULT 'PENDING',
    global_status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Orders (Sub-orders per seller)
CREATE TABLE IF NOT EXISTS store_orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
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
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    store_order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
    offer_variant_id TEXT NOT NULL REFERENCES offer_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    price_pkr INTEGER NOT NULL,
    product_title TEXT NOT NULL,
    variant_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Transactional Outbox
CREATE TABLE IF NOT EXISTS outbox_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'FAILED'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Financial Ledger
CREATE TABLE IF NOT EXISTS financial_ledger (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL, -- 'SALE', 'COMMISSION', 'PAYOUT', 'REFUND'
    amount_pkr INTEGER NOT NULL,
    entry_type TEXT NOT NULL, -- 'CREDIT', 'DEBIT'
    reference_id TEXT, -- store_order_id or payout_id
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payouts
CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    amount_pkr INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'PROCESSING', 'COMPLETED'
    bank_reference TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
