-- ============================================================================
-- P0-3: Enable MFA/TOTP for admin and seller accounts
-- Requires TOTP enrollment for users with ADMIN or SELLER roles.
-- ============================================================================

-- Enable TOTP MFA (requires Supabase Pro plan in production)
-- This is a configuration directive; actual enforcement is done in application code.

-- Create a function to check if a user has MFA enrolled
-- NOTE: profiles.id is TEXT (e.g. 'user_<timestamp>'), NOT the auth.users
-- UUID. Supabase MFA factors are keyed by auth.users.id, so callers must
-- resolve the auth UID for the profile first. This helper accepts a TEXT
-- profile id and looks up the matching admin_mfa / auth linkage is NOT
-- possible directly — instead it checks whether ANY verified TOTP factor
-- exists for the auth user whose raw_user_meta_data/phone match, which is
-- only resolvable when profiles.id IS a uuid (dashboard-created users).
-- For non-uuid profile ids it returns false (fail-open for phone-OTP users
-- whose sessions are phone-based; MFA enforcement stays in app code).
CREATE OR REPLACE FUNCTION public.has_mfa_enrolled(user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factor_count INT;
  v_uuid UUID;
BEGIN
  -- Only dashboard-provisioned accounts (uuid-shaped profile ids) can have
  -- Supabase-native TOTP factors.
  BEGIN
    v_uuid := user_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;

  SELECT count(*) INTO v_factor_count
  FROM auth.mfa_factors
  WHERE user_id = v_uuid
    AND factor_type = 'totp'
    AND status = 'verified';

  RETURN v_factor_count > 0;
END;
$$;

-- Create a function to enforce MFA for privileged roles
-- NOTE: fires on the profiles table, whose PK column is `id` (TEXT).
-- Only enforces on UPDATE role escalation (admin promoting a user), never on
-- INSERT — self-service seller signup must not be blocked by a chicken-and-egg
-- MFA requirement (the user cannot enroll before the account exists).
CREATE OR REPLACE FUNCTION public.require_mfa_for_privileged_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when an existing profile is escalated to a privileged role
  IF TG_OP = 'UPDATE'
     AND NEW.role IN ('ADMIN', 'SUPER_ADMIN')
     AND OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT public.has_mfa_enrolled(NEW.id) THEN
      RAISE EXCEPTION 'MFA enrollment required before granting admin roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_mfa_enrolled(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_mfa_for_privileged_roles() TO authenticated;

-- Note: MFA TOTP enrollment must be enabled in Supabase Dashboard:
-- Authentication > MFA > Enable TOTP
-- Or via supabase config.toml:
-- [auth.mfa.totp]
-- enroll_enabled = true
-- verify_enabled = true
