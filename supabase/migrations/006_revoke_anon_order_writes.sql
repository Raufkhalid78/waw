-- ============================================================================
-- P0-3: Revoke anonymous order-table writes
-- Anonymous users must NOT have direct INSERT on order tables.
-- Guest checkout (if needed) should go through a validated RPC with rate
-- limiting, inventory checks, and phone verification.
-- ============================================================================

-- Revoke anonymous INSERT on order tables
REVOKE INSERT ON orders FROM anon;
REVOKE INSERT ON store_orders FROM anon;
REVOKE INSERT ON order_items FROM anon;

-- Revoke anonymous SELECT on order tables (orders are private to buyer/seller)
REVOKE SELECT ON orders FROM anon;
REVOKE SELECT ON store_orders FROM anon;
REVOKE SELECT ON order_items FROM anon;

-- Deny all anonymous access via RLS as defense-in-depth
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE store_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;

-- Explicit deny policies for anon (belt-and-suspenders with REVOKE)
CREATE POLICY "anon_cannot_read_orders" ON orders
  FOR SELECT TO anon USING (false);

CREATE POLICY "anon_cannot_insert_orders" ON orders
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "anon_cannot_read_store_orders" ON store_orders
  FOR SELECT TO anon USING (false);

CREATE POLICY "anon_cannot_insert_store_orders" ON store_orders
  FOR INSERT TO anon WITH CHECK (false);

CREATE POLICY "anon_cannot_read_order_items" ON order_items
  FOR SELECT TO anon USING (false);

CREATE POLICY "anon_cannot_insert_order_items" ON order_items
  FOR INSERT TO anon WITH CHECK (false);

-- ============================================================================
-- Guest checkout: If guest checkout is required in the future, create a
-- signed-session RPC (e.g., guest_checkout_session) that:
--   1. Requires phone verification (OTP)
--   2. Rate limits per IP/phone
--   3. Reserves inventory before writing
--   4. Validates all item prices and stock server-side
--   5. Creates order via service_role, not anon role
-- Do NOT re-grant anon INSERT on order tables.
-- ============================================================================
