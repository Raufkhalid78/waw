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
    'SAFEPAY_CARD',
    'SAFEPAY_RAAST',
    'PAYFAST_WALLET_JAZZCASH',
    'PAYFAST_WALLET_EASYPAISA',
    'PAYFAST_CARD',
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
  CREATE TYPE "PayoutStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'PAID', 'HELD', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table (Integrates with Supabase Auth)
CREATE TABLE IF NOT EXISTS "Profile" (
  "id" TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  "phone" TEXT UNIQUE NOT NULL,
  "email" TEXT UNIQUE,
  "role" "UserRole" NOT NULL DEFAULT 'BUYER',
  "avatarUrl" TEXT,
  "isWhatsAppVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Stores Table (1P Hubs & 3P Verified Merchants)
CREATE TABLE IF NOT EXISTS "Store" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "ownerId" TEXT NOT NULL REFERENCES "Profile"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "logoUrl" TEXT,
  "bannerUrl" TEXT,
  "sellerType" "SellerType" NOT NULL DEFAULT 'THIRD_PARTY',
  "status" "StoreStatus" NOT NULL DEFAULT 'PENDING_KYC',
  "commissionRatePercentage" INTEGER NOT NULL DEFAULT 10,
  "cnicNumber" TEXT,
  "bankAccountTitle" TEXT,
  "bankAccountNumber" TEXT,
  "bankName" TEXT,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "name" TEXT NOT NULL,
  "nameUrdu" TEXT,
  "slug" TEXT UNIQUE NOT NULL,
  "iconUrl" TEXT,
  "parentId" TEXT REFERENCES "Category"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "storeId" TEXT REFERENCES "Store"("id") ON DELETE SET NULL,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT,
  "title" TEXT NOT NULL,
  "titleUrdu" TEXT,
  "slug" TEXT UNIQUE NOT NULL,
  "description" TEXT NOT NULL,
  "descriptionUrdu" TEXT,
  "isFirstParty" BOOLEAN NOT NULL DEFAULT false,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isSponsored" BOOLEAN NOT NULL DEFAULT false,
  "basePricePkr" INTEGER NOT NULL,
  "compareAtPricePkr" INTEGER,
  "costPricePkr" INTEGER,
  "images" TEXT[] NOT NULL DEFAULT '{}',
  "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "ratingCount" INTEGER NOT NULL DEFAULT 0,
  "soldCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 6. Product Variants (SKU, Size, Color, Stock)
CREATE TABLE IF NOT EXISTS "ProductVariant" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "sku" TEXT UNIQUE NOT NULL,
  "title" TEXT NOT NULL,
  "pricePkr" INTEGER NOT NULL,
  "compareAtPricePkr" INTEGER,
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  "attributes" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "buyerId" TEXT NOT NULL REFERENCES "Profile"("id"),
  "buyerName" TEXT NOT NULL,
  "buyerPhone" TEXT NOT NULL,
  "shippingAddress" TEXT NOT NULL,
  "shippingCity" TEXT NOT NULL,
  "shippingProvince" TEXT NOT NULL,
  "subtotalPkr" INTEGER NOT NULL,
  "shippingFeePkr" INTEGER NOT NULL DEFAULT 200,
  "codFeePkr" INTEGER NOT NULL DEFAULT 0,
  "discountPkr" INTEGER NOT NULL DEFAULT 0,
  "totalPkr" INTEGER NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "orderStatus" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 8. Shipments Table (PostEx Courier Consignments & Tracking)
CREATE TABLE IF NOT EXISTS "Shipment" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "courier" "CourierProvider" NOT NULL DEFAULT 'POSTEX',
  "trackingNumber" TEXT UNIQUE NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "isCod" BOOLEAN NOT NULL DEFAULT false,
  "codAmountPkr" INTEGER NOT NULL DEFAULT 0,
  "courierCostPkr" INTEGER NOT NULL DEFAULT 0,
  "estimatedDeliveryDate" TIMESTAMP WITH TIME ZONE,
  "trackingUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 9. Order Items Table (Multi-Vendor Splitting)
CREATE TABLE IF NOT EXISTS "OrderItem" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id"),
  "variantId" TEXT REFERENCES "ProductVariant"("id"),
  "storeId" TEXT REFERENCES "Store"("id"),
  "sellerType" "SellerType" NOT NULL DEFAULT 'THIRD_PARTY',
  "unitPricePkr" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "totalPricePkr" INTEGER NOT NULL,
  "wawCommissionPkr" INTEGER NOT NULL DEFAULT 0,
  "sellerPayoutPkr" INTEGER NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "shipmentId" TEXT REFERENCES "Shipment"("id"),
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 10. Payments Table (Safepay & PayFast Audit Log)
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
  "amountPkr" INTEGER NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "gatewayReference" TEXT,
  "rawResponse" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 11. Payouts Table (Merchant Bank Settlements)
CREATE TABLE IF NOT EXISTS "Payout" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "storeId" TEXT NOT NULL REFERENCES "Store"("id") ON DELETE CASCADE,
  "amountPkr" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'SCHEDULED',
  "bankReference" TEXT,
  "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "settledAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 12. Reviews Table
CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "buyerId" TEXT NOT NULL REFERENCES "Profile"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
  "comment" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 13. Platform Settings Table
CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" TEXT PRIMARY KEY,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS idx_products_store ON "Product"("storeId");
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON "Order"("buyerId");
CREATE INDEX IF NOT EXISTS idx_orders_status ON "Order"("orderStatus");
CREATE INDEX IF NOT EXISTS idx_order_items_order ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON "Shipment"("trackingNumber");
