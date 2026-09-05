-- ==============================================================================
-- ⚠️ DEPRECATED — DO NOT USE FOR NEW INSTALLATIONS
-- ==============================================================================
-- This file is the ORIGINAL legacy schema and is kept for reference only.
-- For new installations or schema verification, use:
--   supabase/migrations/SCHEMA_COMPLETE.sql
-- For incremental migrations, use the numbered migration files:
--   supabase/migrations/002_* through 012_*
-- ==============================================================================

-- ==============================================================================
-- Waw (واو) Marketplace — Supabase PostgreSQL Production Schema
-- Supports Multi-Vendor, 1P Flagship, SBP Escrow Ledger, PostEx Courier, & Typesense
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'SUPPORT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StoreStatus" AS ENUM ('PENDING_KYC', 'ACTIVE', 'SUSPENDED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SellerType" AS ENUM ('FIRST_PARTY', 'THIRD_PARTY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM (
    'XPAY_CARD',
    'XPAY_WALLET_JAZZCASH',
    'XPAY_WALLET_EASYPAISA',
    'RAAST_P2M_QR',
    'COD'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'PAID',
    'ESCROW_HELD',
    'COD_PENDING',
    'COD_COLLECTED',
    'FAILED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CourierProvider" AS ENUM ('POSTEX', 'TRAX', 'LEOPARDS', 'TCS', 'WAW_FLEET');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayoutStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'COMPLETED', 'PAID', 'HELD', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  role "UserRole" NOT NULL DEFAULT 'BUYER',
  avatar_url TEXT,
  is_whatsapp_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Stores Table
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  seller_type "SellerType" NOT NULL DEFAULT 'THIRD_PARTY',
  status "StoreStatus" NOT NULL DEFAULT 'PENDING_KYC',
  commission_rate_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  cnic_number TEXT,
  bank_account_title TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created with older schema
ALTER TABLE stores ADD COLUMN IF NOT EXISTS cnic_number TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_account_title TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  name_urdu TEXT,
  slug TEXT UNIQUE NOT NULL,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  description TEXT,
  description_urdu TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created with older schema
ALTER TABLE categories ADD COLUMN IF NOT EXISTS name_urdu TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description_urdu TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS category_schemas (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  schema_definition JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed Initial Verified Taxonomy
INSERT INTO categories (id, name, name_urdu, slug, parent_id, sort_order, is_active, image_url, description)
VALUES
  ('cat_electronics', 'Electronics & Mobility', 'الیکٹرانکس اور موبائل', 'mobiles-tech', NULL, 1, true, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80', 'Smartphones, ANC audio, wearables and chargers.'),
  ('cat_fashion', 'Fashion & Apparel', 'فیشن اور ملبوسات', 'fashion', NULL, 2, true, 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80', 'Women unstitched lawn, festive silk, and ready-to-wear collections.'),
  ('cat_leather', 'Leather Craft & Footwear', 'چمڑے کا سامان اور جوتے', 'leather-craft', NULL, 3, true, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80', 'Pure cowhide leather wallets, bags, and handmade traditional footwear.'),
  ('cat_beauty', 'Beauty & Fragrance', 'خوبصورتی اور عطر', 'beauty-fragrance', NULL, 4, true, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80', 'Authentic non-alcoholic attar, pure oud, and grooming essentials.'),
  ('cat_sports', 'Sports & Outdoors', 'کھیلوں کا سامان', 'sialkot-sports', NULL, 5, true, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80', 'Sialkot export-grade match footballs, English willow bats and gear.'),
  ('cat_home', 'Home & Living', 'گھریلو سجاوٹ اور سامان', 'home-living', NULL, 6, true, 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300&auto=format&fit=crop&q=80', 'Décor, lighting, bedsheets, and artisan kitchen essentials.'),
  ('cat_heritage', 'Pakistani Heritage & Handmade', 'پاکستانی ثقافت اور دستکاری', 'home-heritage', NULL, 7, true, 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300&auto=format&fit=crop&q=80', 'Multani blue pottery, handmade brass art, and cultural souvenirs.'),
  -- Child Subcategories
  ('cat_audio', 'Audio & Wireless Earbuds', 'وائرلیس ایئربڈز اور آڈیو', 'wireless-earbuds', 'cat_electronics', 1, true, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80', 'True wireless earbuds with ANC and deep bass.'),
  ('cat_watches', 'Smart Watches & Wearables', 'سمارٹ واچز', 'smart-watches', 'cat_electronics', 2, true, 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300&auto=format&fit=crop&q=80', 'AMOLED display smart watches and health trackers.'),
  ('cat_lawn', 'Women Unstitched & Lawn', 'خواتین کے ان سلے لان سوٹ', 'womens-lawn', 'cat_fashion', 1, true, 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80', 'Pure lawn 3-piece embroidered suits.'),
  ('cat_shoes', 'Handmade Peshawari Chappal', 'ہاتھ سے بنی پشاوری چپل', 'peshawari-chappal', 'cat_leather', 1, true, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80', 'Authentic Norozi and tyre sole Peshawari chappals.'),
  ('cat_attar', 'Pure Attar & Concentrated Oils', 'خالص عطر اور پرفیوم آئلز', 'attar-fragrance', 'cat_beauty', 1, true, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80', 'Long lasting alcohol-free artisan attar.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_urdu = EXCLUDED.name_urdu,
  parent_id = EXCLUDED.parent_id,
  image_url = EXCLUDED.image_url,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- 5. Products Table

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  title_urdu TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price_pkr INTEGER NOT NULL,
  compare_at_price_pkr INTEGER,
  cost_price_pkr INTEGER,
  images TEXT[] NOT NULL DEFAULT '{}',
  thumbnail TEXT,
  seller_type "SellerType" NOT NULL DEFAULT 'THIRD_PARTY',
  is_first_party BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  tags TEXT[] NOT NULL DEFAULT '{}',
  weight_kg NUMERIC(6,2),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created with older schema
ALTER TABLE products ADD COLUMN IF NOT EXISTS title_urdu TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price_pkr INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_type "SellerType" NOT NULL DEFAULT 'THIRD_PARTY';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_first_party BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER NOT NULL DEFAULT 0;

-- 6. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_adjustment_pkr INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_number TEXT UNIQUE NOT NULL,
  buyer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_province TEXT NOT NULL,
  subtotal_pkr INTEGER NOT NULL,
  shipping_fee_pkr INTEGER NOT NULL,
  cod_fee_pkr INTEGER NOT NULL DEFAULT 0,
  total_pkr INTEGER NOT NULL,
  payment_method "PaymentMethod" NOT NULL,
  payment_status "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  order_status "OrderStatus" NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price_pkr INTEGER NOT NULL,
  total_price_pkr INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method "PaymentMethod" NOT NULL,
  status "PaymentStatus" NOT NULL,
  amount_pkr INTEGER NOT NULL,
  gateway_reference TEXT,
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_provider "CourierProvider" NOT NULL,
  tracking_number TEXT,
  label_url TEXT,
  status TEXT NOT NULL,
  estimated_delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Payouts Table (SBP Escrow)
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  amount_pkr INTEGER NOT NULL,
  commission_pkr INTEGER NOT NULL,
  status "PayoutStatus" NOT NULL DEFAULT 'SCHEDULED',
  bank_reference TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PHASE 1: SPLIT-ORDER MULTI-VENDOR FULFILLMENT
-- ============================================================

-- 13. Store Orders (Sub-Orders per Seller)
-- A single parent order splits into one store_order per distinct seller
CREATE TABLE IF NOT EXISTS store_orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  subtotal_pkr INTEGER NOT NULL,
  shipping_fee_pkr INTEGER NOT NULL DEFAULT 200,
  commission_pkr INTEGER NOT NULL DEFAULT 0,
  seller_payout_pkr INTEGER NOT NULL DEFAULT 0,
  order_status "OrderStatus" NOT NULL DEFAULT 'PENDING',
  packed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Migrate order_items to reference store_orders instead of orders directly
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS store_order_id TEXT REFERENCES store_orders(id) ON DELETE CASCADE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS store_order_id TEXT REFERENCES store_orders(id) ON DELETE CASCADE;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS store_order_id TEXT REFERENCES store_orders(id) ON DELETE SET NULL;

-- ============================================================
-- PHASE 2: PROMOTIONS & FLASH SALES ENGINE
-- ============================================================

-- New Enum for Discount Types
DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_PKR', 'FREE_SHIPPING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 14. Coupons Table
-- store_id = NULL means platform-wide (Waw pays). store_id = X means seller-scoped (Seller pays).
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  code TEXT UNIQUE NOT NULL,
  store_id TEXT REFERENCES stores(id) ON DELETE CASCADE, -- NULL = platform-wide
  discount_type "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
  discount_value NUMERIC(10,2) NOT NULL, -- e.g. 10 = 10%, or 500 = PKR 500 off
  min_spend_pkr INTEGER NOT NULL DEFAULT 0,
  max_discount_pkr INTEGER, -- cap for percentage discounts
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 15. Flash Sales Table
CREATE TABLE IF NOT EXISTS flash_sales (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  title TEXT NOT NULL,
  title_urdu TEXT,
  banner_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 16. Flash Sale Items Table
CREATE TABLE IF NOT EXISTS flash_sale_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  flash_sale_id TEXT NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  promotional_price_pkr INTEGER NOT NULL,
  allocated_stock INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(flash_sale_id, variant_id)
);

-- 17. User Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 18. Server-Backed Carts & Cart Items Tables
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  guest_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 19. Return Requests (RMA) & Return Items Tables
CREATE TABLE IF NOT EXISTS return_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_order_id TEXT REFERENCES store_orders(id) ON DELETE SET NULL,
  buyer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  evidence_images TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, APPROVED, REVERSE_PICKUP_BOOKED, RECEIVED, REFUNDED, REJECTED
  reverse_courier_cn TEXT,
  refund_amount_pkr INTEGER NOT NULL DEFAULT 0,
  staff_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  return_request_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 20. Platform Audit Logs Table (Immutable Staff & Operational Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  actor_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'SYSTEM',
  action TEXT NOT NULL, -- KYC_APPROVED, KYC_REJECTED, ORDER_CANCELLED, MANUAL_PRICE_OVERRIDE, PAYOUT_SETTLED
  target_resource_type TEXT NOT NULL,
  target_resource_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 21. Webhooks Idempotency Table
CREATE TABLE IF NOT EXISTS xpay_webhooks_log (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  transaction_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 14. Atomic Inventory Deduction Function (Phase 2)
CREATE OR REPLACE FUNCTION deduct_inventory(p_variant_id TEXT, qty INT) 
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE product_variants 
  SET stock_quantity = stock_quantity - qty 
  WHERE id = p_variant_id AND stock_quantity >= qty;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 15. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE xpay_webhooks_log ENABLE ROW LEVEL SECURITY;

-- 16. RLS Policies (Phase 2)

-- PROFILES: Users can read and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid()::TEXT);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()::TEXT);

-- STORES: Public read, owners can mutate
DROP POLICY IF EXISTS "Stores are publicly readable" ON stores;
CREATE POLICY "Stores are publicly readable" ON stores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Store owners can update their store" ON stores;
CREATE POLICY "Store owners can update their store" ON stores FOR UPDATE USING (owner_id = auth.uid()::TEXT);

-- PRODUCTS: Public read, store owners can mutate
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Products are publicly readable" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Store owners can insert products" ON products;
CREATE POLICY "Store owners can insert products" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT)
);
DROP POLICY IF EXISTS "Store owners can update products" ON products;
CREATE POLICY "Store owners can update products" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT)
);
DROP POLICY IF EXISTS "Store owners can delete products" ON products;
CREATE POLICY "Store owners can delete products" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT)
);

-- PRODUCT VARIANTS: Public read, store owners can mutate
DROP POLICY IF EXISTS "Variants are publicly readable" ON product_variants;
CREATE POLICY "Variants are publicly readable" ON product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Store owners can manage variants" ON product_variants;
CREATE POLICY "Store owners can manage variants" ON product_variants FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products 
    JOIN stores ON stores.id = products.store_id 
    WHERE products.id = product_variants.product_id AND stores.owner_id = auth.uid()::TEXT
  )
);

-- ORDERS & PAYMENTS: Buyers can see their own
DROP POLICY IF EXISTS "Buyers can view own orders" ON orders;
CREATE POLICY "Buyers can view own orders" ON orders FOR SELECT USING (buyer_id = auth.uid()::TEXT);
DROP POLICY IF EXISTS "Buyers can view own order items" ON order_items;
CREATE POLICY "Buyers can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.buyer_id = auth.uid()::TEXT)
);
DROP POLICY IF EXISTS "Buyers can view own payments" ON payments;
CREATE POLICY "Buyers can view own payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.buyer_id = auth.uid()::TEXT)
);

-- Note: The Express Backend (Node.js) currently uses the 'service_role' key to bypass RLS for systemic operations 
-- like webhook processing and automated fulfillment. The policies above apply to direct client-side Supabase access.

-- 17. Performance Indexing (Phase 2)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, base_price_pkr, is_active);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);


-- ============================================================
-- PHASE 3: DYNAMIC CONFIGURATION & CONTENT
-- ============================================================

-- 22. Delivery Cities / Serviceability Locations
CREATE TABLE IF NOT EXISTS serviceability_locations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  city_name TEXT UNIQUE NOT NULL,
  city_name_urdu TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  courier_partners TEXT[] NOT NULL DEFAULT '{}',
  estimated_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 23. Popular Searches / Suggestions
CREATE TABLE IF NOT EXISTS search_suggestions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  term TEXT UNIQUE NOT NULL,
  term_urdu TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 24. Promotional Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  tag TEXT,
  title TEXT NOT NULL,
  title_urdu TEXT,
  banner_url TEXT,
  link_url TEXT,
  link_text TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'PROMO_STRIP', -- e.g., TOP_BANNER, PROMO_STRIP, SHORTCUT_LINK
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Initial seed for configuration
INSERT INTO serviceability_locations (city_name, is_active) VALUES
('Lahore', true), ('Karachi', true), ('Islamabad', true), ('Rawalpindi', true),
('Faisalabad', true), ('Peshawar', true), ('Multan', true), ('Sialkot', true),
('Gujranwala', true), ('Quetta', true) ON CONFLICT (city_name) DO NOTHING;

INSERT INTO search_suggestions (term, score, is_active) VALUES
('Khaadi Lawn 2026', 100, true),
('AirPods Pro ANC', 90, true),
('Pure Leather Wallet', 85, true),
('Peshawari Chappal', 80, true),
('Amoled Smart Watch', 75, true),
('Sialkot Match Football', 70, true),
('Royal Oud Attar', 65, true) ON CONFLICT (term) DO NOTHING;

-- Since campaign doesn't have unique constraint on tag or title, we just insert them directly
-- To make this idempotent, we could clear old ones, but for seed we will just delete existing seeds.
DELETE FROM campaigns WHERE campaign_type = 'PROMO_STRIP';

INSERT INTO campaigns (tag, title, link_url, link_text, campaign_type, sort_order) VALUES
('⚡ MEGA DEALS', 'Azadi Celebration: Up to 50% OFF with voucher AZADI2026 at checkout!', '/category/mobiles-tech', 'Shop Deals', 'PROMO_STRIP', 1),
('🚚 FREE DELIVERY', 'Zero shipping charges on all orders above PKR 5,000 nationwide across Pakistan.', '/cart', 'Learn More', 'PROMO_STRIP', 2),
('🛡️ SECURE CHECKOUT', '100% Safe Prepayments & 7-Day Hassle-Free Returns with Escrow Buyer Protection.', '/buyer-protection', 'View Guarantee', 'PROMO_STRIP', 3),
('🏪 SELL ON WAW', '0% Listing Fees & Nationwide PostEx Pickups for verified Pakistani merchants.', '/sell', 'Register Store', 'PROMO_STRIP', 4);

ALTER TABLE serviceability_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Serviceability readable by all" ON serviceability_locations;
CREATE POLICY "Serviceability readable by all" ON serviceability_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Search suggestions readable by all" ON search_suggestions;
CREATE POLICY "Search suggestions readable by all" ON search_suggestions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Campaigns readable by all" ON campaigns;
CREATE POLICY "Campaigns readable by all" ON campaigns FOR SELECT USING (true);
