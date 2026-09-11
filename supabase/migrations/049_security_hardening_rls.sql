-- 049_security_hardening_rls.sql
-- SECURITY HARDENING (production-readiness audit remediation)
--
-- Fixes five critical RLS gaps:
--   C1. admin_mfa policy leaked every admin's TOTP secret to any authenticated user
--   C2. Self-service privilege escalation: profiles FOR UPDATE allowed any user to
--       set own role='ADMIN' (MFA trigger only guarded some cases)
--   C3. Seller CNIC / bank account numbers were publicly readable via stores
--   C4. Financial SECURITY DEFINER RPCs were executable by anon (default PUBLIC ACL)
--   C5. Store owners could set own status/is_verified/commission_rate_percentage
--
-- Plus: guest cart world-writability, search_path hardening for SECURITY DEFINER
-- functions, and managed storage buckets.

-- ============================================================================
-- 1. admin_mfa: users may only ever touch their OWN enrollment row
-- ============================================================================
DROP POLICY IF EXISTS "Admins manage own MFA" ON public.admin_mfa;
CREATE POLICY "Users manage own MFA only" ON public.admin_mfa
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ============================================================================
-- 2. profiles: block self-service role escalation
-- ============================================================================
-- The API and admin tooling always run with service_role (RLS bypassed, but
-- triggers still fire), so we allow role changes ONLY from service contexts.
CREATE OR REPLACE FUNCTION public.block_unprivileged_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user NOT IN ('postgres', 'service_role', 'supabase_admin', 'authenticator') THEN
    RAISE EXCEPTION 'Role changes are not permitted via direct table access';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_role_change ON public.profiles;
CREATE TRIGGER trg_block_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.block_unprivileged_role_change();

-- ============================================================================
-- 3. stores: seller KYC/financial PII is never publicly readable
-- ============================================================================
-- Column-level grants: anon/authenticated may read ONLY public catalog columns.
-- CNIC, bank account fields, address and commission rate are removed from the
-- public projection. Seller/admin portals use service_role and keep full access.
REVOKE ALL ON public.stores FROM anon, authenticated;
GRANT SELECT (
  id, name, slug, description, logo_url, banner_url,
  seller_type, status, city, is_verified,
  rating_average, rating_count, response_rate,
  created_at, updated_at
) ON public.stores TO anon, authenticated;

-- Store owners can no longer tamper with privilege/commission columns via
-- direct table access either (owner portal flows run through service_role).
CREATE OR REPLACE FUNCTION public.block_store_privilege_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin', 'authenticator') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.commission_rate_percentage IS DISTINCT FROM OLD.commission_rate_percentage THEN
      RAISE EXCEPTION 'Store status, verification and commission can only be changed by the marketplace';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_privilege_guard ON public.stores;
CREATE TRIGGER trg_store_privilege_guard
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.block_store_privilege_tampering();

-- ============================================================================
-- 4. Financial RPCs: executable ONLY by service_role
-- ============================================================================
REVOKE ALL ON FUNCTION public.settle_payout_atomic(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_order_atomic(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_inventory_snapshot(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_expired_checkout_reservations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aggregate_product_sales(TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_pending_bookings(INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_outbox_events(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_courier_status_event(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_order_payment(TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_notification_event(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_loyalty_points(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 5. Guest carts: cart rows are only reachable through the API (service_role)
-- ============================================================================
REVOKE ALL ON public.carts FROM anon, authenticated;
REVOKE ALL ON public.cart_items FROM anon, authenticated;

-- ============================================================================
-- 6. search_path hardening for SECURITY DEFINER functions (defended against
--    search_path hijacking when public is first on the search path)
-- ============================================================================
ALTER FUNCTION public.is_verified_purchase(TEXT, TEXT) SET search_path = public;
ALTER FUNCTION public.update_product_rating() SET search_path = public;

-- ============================================================================
-- 7. Storage buckets (product images, returns, avatars) with explicit policies
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-images', 'product-images', true),
  ('return-images', 'return-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for catalog buckets
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id IN ('product-images', 'return-images', 'avatars'));

-- Writes are performed by the API via service_role only — deny direct
-- client writes to prevent arbitrary file hosting.
DROP POLICY IF EXISTS "Service write media" ON storage.objects;
CREATE POLICY "Service write media" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('product-images', 'return-images', 'avatars')
    AND auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Service delete media" ON storage.objects;
CREATE POLICY "Service delete media" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('product-images', 'return-images', 'avatars')
    AND auth.role() = 'service_role'
  );

INSERT INTO schema_migrations (version, applied_at) VALUES ('049_security_hardening_rls', NOW()) ON CONFLICT DO NOTHING;
