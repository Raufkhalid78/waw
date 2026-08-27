-- ==============================================================================
-- AUDIT FIXES: DROP LEGACY RLS
-- Removes legacy permissive policies that bypass strict active-only rules.
-- ==============================================================================

-- 1. Drop Legacy Permissive Policies
DROP POLICY IF EXISTS "Stores are publicly readable" ON stores;
DROP POLICY IF EXISTS "Products are publicly readable" ON products;
DROP POLICY IF EXISTS "Variants are publicly readable" ON product_variants;
DROP POLICY IF EXISTS "Serviceability readable by all" ON serviceability_locations;
DROP POLICY IF EXISTS "Search suggestions readable by all" ON search_suggestions;
DROP POLICY IF EXISTS "Campaigns readable by all" ON campaigns;
-- Note: categories did not have an RLS policy in the baseline schema

-- (The active-only public-read policies were already created in 20260827130000_audit_fixes)
