-- ==============================================================================
-- AUDIT FIXES MIGRATION
-- Fixes default product order columns, security grants, and enforces data integrity
-- ==============================================================================

-- 1. Add missing merchandising columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchandising_rank INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT false;

-- 2. Revoke overly broad grants from anon and authenticated roles
-- We previously granted ALL ON ALL TABLES which bypassed least-privilege principles.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Grant strict SELECT access to public catalog tables for anon/authenticated
GRANT SELECT ON categories TO anon, authenticated;
GRANT SELECT ON products TO anon, authenticated;
GRANT SELECT ON product_variants TO anon, authenticated;
GRANT SELECT ON stores TO anon, authenticated;
GRANT SELECT ON campaigns TO anon, authenticated;
GRANT SELECT ON search_suggestions TO anon, authenticated;
GRANT SELECT ON serviceability_locations TO anon, authenticated;

-- Ensure RLS is enabled on these tables so that policies can further restrict if needed
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Ensure public read policies exist for the catalog
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON categories;
CREATE POLICY "Public categories are viewable by everyone" ON categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public products are viewable by everyone" ON products;
CREATE POLICY "Public products are viewable by everyone" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public product variants are viewable by everyone" ON product_variants;
CREATE POLICY "Public product variants are viewable by everyone" ON product_variants FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public stores are viewable by everyone" ON stores;
CREATE POLICY "Public stores are viewable by everyone" ON stores FOR SELECT USING (status = 'ACTIVE');

-- Note: The service_role retains ALL privileges from previous migrations, bypassing RLS.
