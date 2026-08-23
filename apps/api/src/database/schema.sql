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
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

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
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  size TEXT,
  color TEXT,
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

-- 13. Webhooks Idempotency Table (Phase 3)
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
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid()::TEXT);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()::TEXT);

-- STORES: Public read, owners can mutate
CREATE POLICY "Stores are publicly readable" ON stores FOR SELECT USING (true);
CREATE POLICY "Store owners can update their store" ON stores FOR UPDATE USING (owner_id = auth.uid()::TEXT);

-- PRODUCTS: Public read, store owners can mutate
CREATE POLICY "Products are publicly readable" ON products FOR SELECT USING (true);
CREATE POLICY "Store owners can insert products" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT)
);
CREATE POLICY "Store owners can update products" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT)
);
CREATE POLICY "Store owners can delete products" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT)
);

-- PRODUCT VARIANTS: Public read, store owners can mutate
CREATE POLICY "Variants are publicly readable" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Store owners can manage variants" ON product_variants FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products 
    JOIN stores ON stores.id = products.store_id 
    WHERE products.id = product_variants.product_id AND stores.owner_id = auth.uid()::TEXT
  )
);

-- ORDERS & PAYMENTS: Buyers can see their own
CREATE POLICY "Buyers can view own orders" ON orders FOR SELECT USING (buyer_id = auth.uid()::TEXT);
CREATE POLICY "Buyers can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.buyer_id = auth.uid()::TEXT)
);
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

