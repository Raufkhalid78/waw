-- ============================================================================
-- WAW MARKETPLACE — COMPLETE PRODUCTION SCHEMA
-- ============================================================================
-- Run this ONCE on a fresh Supabase database to create all tables, enums,
-- functions, views, indexes, RLS policies, and permissions.
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('BUYER','SELLER','ADMIN','SUPPORT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "StoreStatus" AS ENUM ('PENDING_KYC','ACTIVE','SUSPENDED','REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "SellerType" AS ENUM ('FIRST_PARTY','THIRD_PARTY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PaymentMethod" AS ENUM ('XPAY_CARD','XPAY_WALLET_JAZZCASH','XPAY_WALLET_EASYPAISA','RAAST_P2M_QR','COD'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','AUTHORIZED','PAID','ESCROW_HELD','COD_PENDING','COD_COLLECTED','FAILED','REFUNDED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "OrderStatus" AS ENUM ('PENDING','CONFIRMED','PROCESSING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RETURNED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "CourierProvider" AS ENUM ('POSTEX','TRAX','LEOPARDS','TCS','WAW_FLEET'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "PayoutStatus" AS ENUM ('SCHEDULED','PROCESSING','COMPLETED','PAID','HELD','HELD_PENDING_DELIVERY','FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE','FIXED_PKR','FREE_SHIPPING'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ── Auth / Users ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  role "UserRole" NOT NULL DEFAULT 'BUYER',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_whatsapp_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Stores / Sellers ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
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
  response_rate TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Categories ──────────────────────────────────────────────────────────────

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS category_schemas (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  schema_definition JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Catalog (Master Product Listings) ───────────────────────────────────────

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seller Offers (Per-Store Listings) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS seller_offers (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  catalog_product_id TEXT NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  price_pkr INTEGER NOT NULL CHECK (price_pkr > 0),
  original_price_pkr INTEGER,
  condition TEXT DEFAULT 'NEW',
  is_express BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, sku)
);

-- ── Offer Variants ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offer_variants (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  offer_id TEXT NOT NULL REFERENCES seller_offers(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  price_adjustment_pkr INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inventory Ledger (Double-Entry Balance) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  offer_variant_id TEXT NOT NULL REFERENCES offer_variants(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Legacy Products (pre-catalog, kept for migration compat) ────────────────

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
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  tags TEXT[] NOT NULL DEFAULT '{}',
  weight_kg NUMERIC(6,2),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  merchandising_rank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_adjustment_pkr INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Orders ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS serviceable_cities (
  city_name TEXT PRIMARY KEY,
  province TEXT NOT NULL,
  is_cod_eligible BOOLEAN DEFAULT true,
  supported_couriers TEXT[] DEFAULT '{"POSTEX"}',
  estimated_delivery_days_min INTEGER DEFAULT 2,
  estimated_delivery_days_max INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_number TEXT UNIQUE,
  buyer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL REFERENCES serviceable_cities(city_name) ON DELETE RESTRICT,
  shipping_province TEXT,
  subtotal_pkr INTEGER,
  shipping_fee_pkr INTEGER,
  cod_fee_pkr INTEGER DEFAULT 0,
  total_amount_pkr INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  global_status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_orders (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  order_number TEXT UNIQUE,
  subtotal_pkr INTEGER NOT NULL,
  shipping_fee_pkr INTEGER DEFAULT 200,
  commission_pkr INTEGER NOT NULL DEFAULT 0,
  seller_payout_pkr INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  tracking_number TEXT,
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  store_order_id TEXT NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  offer_variant_id TEXT REFERENCES offer_variants(id) ON DELETE RESTRICT,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_pkr INTEGER NOT NULL CHECK (price_pkr >= 0),
  unit_price_pkr INTEGER,
  total_price_pkr INTEGER,
  product_title TEXT,
  variant_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Payments ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method "PaymentMethod" NOT NULL,
  status "PaymentStatus" NOT NULL,
  amount_pkr INTEGER NOT NULL,
  gateway_reference TEXT,
  gateway_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Shipments ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_order_id TEXT REFERENCES store_orders(id) ON DELETE CASCADE,
  courier_provider "CourierProvider" NOT NULL,
  courier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  label_url TEXT,
  status TEXT NOT NULL,
  is_cod BOOLEAN DEFAULT false,
  cod_amount_pkr NUMERIC DEFAULT 0,
  courier_cost_pkr NUMERIC DEFAULT 0,
  estimated_delivery_date TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Payouts ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  store_order_id TEXT REFERENCES store_orders(id) ON DELETE SET NULL,
  amount_pkr INTEGER NOT NULL,
  commission_pkr INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  bank_reference TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payouts_store_order UNIQUE (store_order_id)
);

-- ── Financial Ledger ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_ledger (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,
  amount_pkr INTEGER NOT NULL,
  entry_type TEXT NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Reviews ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'PENDING',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Coupons ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  code TEXT UNIQUE NOT NULL,
  store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
  discount_type "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_spend_pkr INTEGER NOT NULL DEFAULT 0,
  max_discount_pkr INTEGER,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0 CHECK (current_uses >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Flash Sales ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flash_sales (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  title TEXT NOT NULL,
  title_urdu TEXT,
  banner_url TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flash_sale_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  flash_sale_id TEXT NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  promotional_price_pkr INTEGER NOT NULL,
  allocated_stock INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(flash_sale_id, variant_id)
);

-- ── Addresses ───────────────────────────────────────────────────────────────

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Carts ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  guest_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cart_items UNIQUE (cart_id, product_id, variant_id)
);

-- ── Returns (RMA) ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS return_requests (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_order_id TEXT REFERENCES store_orders(id) ON DELETE SET NULL,
  buyer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  evidence_images TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  reverse_courier_cn TEXT,
  refund_amount_pkr INTEGER NOT NULL DEFAULT 0,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_items (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  return_request_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Support Tickets ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY DEFAULT ('stk_' || gen_random_uuid()::text),
  buyer_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution TEXT,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY DEFAULT ('msg_' || gen_random_uuid()::text),
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'User',
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Audit Logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  actor_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL DEFAULT 'SYSTEM',
  action TEXT NOT NULL,
  target_resource_type TEXT NOT NULL,
  target_resource_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CMS Content ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_content (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  key_slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Search Suggestions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_suggestions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  term TEXT UNIQUE NOT NULL,
  term_urdu TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Campaigns / Promos ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  tag TEXT,
  title TEXT NOT NULL,
  title_urdu TEXT,
  banner_url TEXT,
  link_url TEXT,
  link_text TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'PROMO_STRIP',
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Marketplace Settings ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL
);

-- ── Webhook Idempotency ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS xpay_webhooks_log (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  transaction_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_xpay_webhooks_log_transaction_id UNIQUE (transaction_id)
);

-- ── Outbox Events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS outbox_events (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── Schema Migrations Ledger ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. FUNCTIONS
-- ============================================================================

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Atomic inventory deduction
CREATE OR REPLACE FUNCTION deduct_inventory(p_variant_id TEXT, qty INT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE product_variants SET stock_quantity = stock_quantity - qty
  WHERE id = p_variant_id AND stock_quantity >= qty;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. APPLY updated_at TRIGGERS
-- ============================================================================

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','stores','categories','products','product_variants',
    'orders','payments','shipments','payouts','reviews','store_orders',
    'coupons','addresses','carts','cart_items','return_requests',
    'catalog_products','seller_offers','offer_variants','support_tickets',
    'ticket_messages','marketplace_settings'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name='updated_at') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', tbl);
      EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl);
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- Legacy products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, base_price_pkr, is_active);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- Catalog
CREATE INDEX IF NOT EXISTS idx_catalog_products_category ON catalog_products(category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_products_slug ON catalog_products(slug);

-- Seller offers
CREATE INDEX IF NOT EXISTS idx_seller_offers_catalog_product ON seller_offers(catalog_product_id);
CREATE INDEX IF NOT EXISTS idx_seller_offers_store ON seller_offers(store_id);
CREATE INDEX IF NOT EXISTS idx_seller_offers_status ON seller_offers(status);
CREATE INDEX IF NOT EXISTS idx_seller_offers_store_status ON seller_offers(store_id, status);

-- Offer variants
CREATE INDEX IF NOT EXISTS idx_offer_variants_offer ON offer_variants(offer_id);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_variant ON inventory_ledger(offer_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_store ON inventory_ledger(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_reference ON inventory_ledger(reference_id, transaction_type);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_global_status ON orders(global_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);

-- Store orders
CREATE INDEX IF NOT EXISTS idx_store_orders_order ON store_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_store ON store_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_order_id ON store_orders(order_id);

-- Order items
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);

-- Payouts
CREATE INDEX IF NOT EXISTS idx_payouts_store ON payouts(store_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status_scheduled ON payouts(status, scheduled_for);

-- Returns
CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_buyer ON return_requests(buyer_id);

-- Support
CREATE INDEX IF NOT EXISTS idx_support_tickets_buyer ON support_tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- ============================================================================
-- 6. VIEWS (Public Projections)
-- ============================================================================

CREATE OR REPLACE VIEW public_catalog_products AS
SELECT id, title, title_urdu, slug, description, category_id, attributes, images, thumbnail, created_at
FROM catalog_products WHERE is_active = true;

CREATE OR REPLACE VIEW public_seller_offers AS
SELECT id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, condition, is_express, created_at
FROM seller_offers WHERE status = 'ACTIVE';

CREATE OR REPLACE VIEW public_stores AS
SELECT id, name, slug, city, logo_url, banner_url, description, rating_average, rating_count, response_rate, seller_type, created_at
FROM stores WHERE status = 'ACTIVE' AND is_verified = true;

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE xpay_webhooks_log ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Stores are publicly readable" ON stores;
DROP POLICY IF EXISTS "Store owners can update their store" ON stores;
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
DROP POLICY IF EXISTS "Variants are publicly readable" ON product_variants;
DROP POLICY IF EXISTS "Serviceability readable by all" ON serviceability_locations;
DROP POLICY IF EXISTS "Search suggestions readable by all" ON search_suggestions;
DROP POLICY IF EXISTS "Campaigns readable by all" ON campaigns;

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid()::TEXT);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()::TEXT);

-- STORES (public read active only)
CREATE POLICY "Public stores are viewable by everyone" ON stores FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Store owners can update their store" ON stores FOR UPDATE USING (owner_id = auth.uid()::TEXT);

-- CATEGORIES (active only)
CREATE POLICY "Public categories are viewable by everyone" ON categories FOR SELECT USING (is_active = true);

-- PRODUCTS (active only)
CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Store owners can insert products" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT));
CREATE POLICY "Store owners can update products" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT));
CREATE POLICY "Store owners can delete products" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_id AND stores.owner_id = auth.uid()::TEXT));

-- PRODUCT VARIANTS
CREATE POLICY "Public product variants are viewable by everyone" ON product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Store owners can manage variants" ON product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM products JOIN stores ON stores.id = products.store_id
  WHERE products.id = product_variants.product_id AND stores.owner_id = auth.uid()::TEXT));

-- CATALOG PRODUCTS
CREATE POLICY "Public can view active catalog products" ON catalog_products FOR SELECT USING (is_active = true OR auth.role() = 'service_role');

-- SELLER OFFERS
CREATE POLICY "Public can view active seller offers" ON seller_offers FOR SELECT USING (status = 'ACTIVE' OR auth.role() = 'service_role');

-- OFFER VARIANTS
CREATE POLICY "Public can view offer variants" ON offer_variants FOR SELECT USING (true);

-- INVENTORY LEDGER (deny anon)
CREATE POLICY "Deny public anon inventory_ledger read" ON inventory_ledger FOR SELECT TO anon USING (false);

-- ORDERS
CREATE POLICY "Buyers can view own orders" ON orders FOR SELECT USING (buyer_id = auth.uid()::TEXT OR auth.role() = 'service_role');
CREATE POLICY "Deny public anon orders read" ON orders FOR SELECT TO anon USING (false);

-- STORE ORDERS
CREATE POLICY "Store owners can view store orders" ON store_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = store_orders.store_id AND stores.owner_id = auth.uid()::TEXT)
  OR auth.role() = 'service_role');

-- PAYMENTS
CREATE POLICY "Buyers can view own payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.buyer_id = auth.uid()::TEXT));

-- PAYOUTS
CREATE POLICY "Store owners can view payouts" ON payouts FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = payouts.store_id AND stores.owner_id = auth.uid()::TEXT)
  OR auth.role() = 'service_role');
CREATE POLICY "Deny public anon payouts read" ON payouts FOR SELECT TO anon USING (false);

-- FINANCIAL LEDGER
CREATE POLICY "Store owners can view financial ledger" ON financial_ledger FOR SELECT USING (
  EXISTS (SELECT 1 FROM stores WHERE stores.id = financial_ledger.store_id AND stores.owner_id = auth.uid()::TEXT)
  OR auth.role() = 'service_role');

-- REVIEWS
CREATE POLICY "Public can view approved reviews" ON reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Buyers can create reviews" ON reviews FOR INSERT WITH CHECK (buyer_id = auth.uid()::TEXT);
CREATE POLICY "Admins can moderate reviews" ON reviews FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));

-- COUPONS
CREATE POLICY "Public can view active coupons" ON coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));

-- ADDRESSES
CREATE POLICY "Users can manage their own addresses" ON addresses FOR ALL USING (user_id = auth.uid()::TEXT);

-- CARTS
CREATE POLICY "Users can manage their own carts" ON carts FOR ALL USING (user_id = auth.uid()::TEXT OR user_id IS NULL);

-- CART ITEMS
CREATE POLICY "Users can manage items in their carts" ON cart_items FOR ALL USING (
  EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND (carts.user_id = auth.uid()::TEXT OR carts.user_id IS NULL)));

-- RETURN REQUESTS
CREATE POLICY "Buyers can view their own returns" ON return_requests FOR SELECT USING (buyer_id = auth.uid()::TEXT);
CREATE POLICY "Buyers can create return requests" ON return_requests FOR INSERT WITH CHECK (buyer_id = auth.uid()::TEXT);
CREATE POLICY "Admins can manage all returns" ON return_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));

-- RETURN ITEMS
CREATE POLICY "Return item access via return_request ownership" ON return_items FOR ALL USING (
  EXISTS (SELECT 1 FROM return_requests WHERE return_requests.id = return_items.return_request_id
  AND (return_requests.buyer_id = auth.uid()::TEXT
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'))));

-- SUPPORT TICKETS
CREATE POLICY "Buyers can view their own tickets" ON support_tickets FOR SELECT USING (buyer_id = auth.uid()::TEXT);
CREATE POLICY "Buyers can create tickets" ON support_tickets FOR INSERT WITH CHECK (buyer_id = auth.uid()::TEXT);
CREATE POLICY "Admins can view all tickets" ON support_tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));
CREATE POLICY "Admins can update all tickets" ON support_tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));

-- TICKET MESSAGES
CREATE POLICY "Ticket participants can view messages" ON ticket_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_messages.ticket_id
  AND (st.buyer_id = auth.uid()::TEXT
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'))));
CREATE POLICY "Ticket participants can insert messages" ON ticket_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()::TEXT AND EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_messages.ticket_id
  AND (st.buyer_id = auth.uid()::TEXT
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role IN ('ADMIN','SUPPORT')))));

-- AUDIT LOGS
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));

-- CMS / SEARCH / CAMPAIGNS (public read)
CREATE POLICY "Public can view active cms content" ON cms_content FOR SELECT USING (is_active = true OR auth.role() = 'service_role');
CREATE POLICY "Public can view active search suggestions" ON search_suggestions FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view active campaigns" ON campaigns FOR SELECT USING (is_active = true);

-- MARKETPLACE SETTINGS (admin only)
CREATE POLICY "Admins can read settings" ON marketplace_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));
CREATE POLICY "Admins can update settings" ON marketplace_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));
CREATE POLICY "Admins can insert settings" ON marketplace_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::TEXT AND role = 'ADMIN'));

-- ============================================================================
-- 8. PERMISSIONS / GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Public catalog read
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON product_variants TO anon, authenticated;
GRANT SELECT ON stores TO anon, authenticated;
GRANT SELECT ON catalog_products TO anon, authenticated;
GRANT SELECT ON seller_offers TO anon, authenticated;
GRANT SELECT ON offer_variants TO anon, authenticated;
GRANT SELECT ON cms_content TO anon, authenticated;
GRANT SELECT ON search_suggestions TO anon, authenticated;
GRANT SELECT ON campaigns TO anon, authenticated;
GRANT SELECT ON serviceable_cities TO anon, authenticated;

-- Authenticated write
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON store_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON order_items TO authenticated;
GRANT SELECT, INSERT ON inventory_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;
GRANT SELECT, INSERT ON ticket_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON marketplace_settings TO authenticated;

-- Guest checkout
GRANT SELECT, INSERT ON orders TO anon;
GRANT SELECT, INSERT ON store_orders TO anon;
GRANT SELECT, INSERT ON order_items TO anon;

-- ============================================================================
-- 9. CHECK CONSTRAINTS
-- ============================================================================

DO $$ BEGIN ALTER TABLE order_items ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE order_items ADD CONSTRAINT chk_order_items_price_non_negative CHECK (price_pkr >= 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE store_orders ADD CONSTRAINT chk_store_orders_subtotal_non_negative CHECK (subtotal_pkr >= 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE store_orders ADD CONSTRAINT chk_store_orders_commission_non_negative CHECK (commission_pkr >= 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE cart_items ADD CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
