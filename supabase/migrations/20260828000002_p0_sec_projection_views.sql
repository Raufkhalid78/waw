-- ==============================================================================
-- MIGRATION: 20260828000002_p0_sec_projection_views.sql
-- DESCRIPTION: P0-SEC-001 (BLK-05) Public commerce projection views and RLS boundary guards.
-- ==============================================================================

-- 0. Ensure optional columns exist on stores before view creation
ALTER TABLE IF EXISTS stores ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE IF EXISTS stores ADD COLUMN IF NOT EXISTS response_rate TEXT;
ALTER TABLE IF EXISTS stores ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS stores ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.0;
ALTER TABLE IF EXISTS stores ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- 1. Create Public Master Catalog Projection View
CREATE OR REPLACE VIEW public_catalog_products AS
SELECT 
    id,
    title,
    title_urdu,
    slug,
    description,
    category_id,
    attributes,
    images,
    thumbnail,
    created_at
FROM catalog_products
WHERE is_active = true;

-- 2. Create Public Approved Seller Offers Projection View
CREATE OR REPLACE VIEW public_seller_offers AS
SELECT 
    id,
    catalog_product_id,
    store_id,
    sku,
    price_pkr,
    original_price_pkr,
    condition,
    is_express,
    created_at
FROM seller_offers
WHERE status = 'ACTIVE';

-- 3. Create Public Verified Storefront Profile Projection View
-- Explicitly hides sensitive internal operational columns: cnic_number, iban, commission_rate_percentage, owner_id
CREATE OR REPLACE VIEW public_stores AS
SELECT 
    id,
    name,
    slug,
    city,
    logo_url,
    banner_url,
    description,
    rating_average,
    rating_count,
    response_rate,
    seller_type,
    created_at
FROM stores
WHERE status = 'ACTIVE' AND is_verified = true;

-- 4. Set View Permissions
GRANT SELECT ON public_catalog_products TO anon, authenticated;
GRANT SELECT ON public_seller_offers TO anon, authenticated;
GRANT SELECT ON public_stores TO anon, authenticated;

-- 5. Hardened RLS Negative Boundary Policies on Underlying Raw Tables

-- Ensure RLS is active on sensitive tables
ALTER TABLE IF EXISTS catalog_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS seller_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payouts ENABLE ROW LEVEL SECURITY;

-- inventory_ledger: DENY all direct public anonymous reads
DROP POLICY IF EXISTS "Deny public anon inventory_ledger read" ON inventory_ledger;
CREATE POLICY "Deny public anon inventory_ledger read" 
ON inventory_ledger 
FOR SELECT 
TO anon 
USING (false);

-- payouts: DENY all direct public anonymous reads
DROP POLICY IF EXISTS "Deny public anon payouts read" ON payouts;
CREATE POLICY "Deny public anon payouts read" 
ON payouts 
FOR SELECT 
TO anon 
USING (false);

-- orders: DENY all direct public anonymous reads
DROP POLICY IF EXISTS "Deny public anon orders read" ON orders;
CREATE POLICY "Deny public anon orders read" 
ON orders 
FOR SELECT 
TO anon 
USING (false);
