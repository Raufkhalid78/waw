-- ============================================================================
-- [DEPRECATED] FIX: Add missing columns to tables created by old schema
-- ============================================================================
-- DEPRECATED: This file is for legacy databases only. New deployments should
-- use SCHEMA_COMPLETE.sql which already includes all columns and tables.
-- Run this ONLY if migrating from a pre-Phase-1 database.
-- ============================================================================

-- Orders: add order_number if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;

-- Order items: add missing columns
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_pkr INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS total_price_pkr INTEGER;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_title TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Store orders: add missing columns
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS commission_pkr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS seller_payout_pkr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

-- Stores: add missing columns
ALTER TABLE stores ADD COLUMN IF NOT EXISTS seller_type "SellerType" DEFAULT 'THIRD_PARTY';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS rating_average NUMERIC DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.10;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Catalog products: add missing columns
ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS title_urdu TEXT;
ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb;

-- Seller offers: add missing columns
ALTER TABLE seller_offers ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'NEW';

-- Shipments: add missing columns
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS is_cod BOOLEAN DEFAULT false;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cod_amount_pkr NUMERIC DEFAULT 0;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS courier_cost_pkr NUMERIC DEFAULT 0;

-- Reviews: add missing columns
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false;

-- Platform settings: ensure table exists
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search suggestions: ensure table exists
CREATE TABLE IF NOT EXISTS search_suggestions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  term TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaigns: ensure table exists
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  title TEXT NOT NULL,
  tag TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'PROMO_STRIP',
  link_url TEXT,
  link_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coupons: add missing columns
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_uses INTEGER;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS current_uses INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_spend_pkr INTEGER DEFAULT 0;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount_pkr INTEGER;

-- Serviceable cities: ensure table exists
CREATE TABLE IF NOT EXISTS serviceable_cities (
  city_name TEXT PRIMARY KEY,
  province TEXT,
  is_cod_eligible BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_global_status ON orders(global_status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_order_id ON store_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
