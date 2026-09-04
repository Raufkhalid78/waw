-- ============================================================================
-- P0-3: Enable MFA/TOTP for admin and seller accounts
-- Requires TOTP enrollment for users with ADMIN or SELLER roles.
-- ============================================================================

-- Enable TOTP MFA (requires Supabase Pro plan in production)
-- This is a configuration directive; actual enforcement is done in application code.

-- Create a function to check if a user has MFA enrolled
CREATE OR REPLACE FUNCTION public.has_mfa_enrolled(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factor_count INT;
BEGIN
  SELECT count(*) INTO v_factor_count
  FROM auth.mfa_factors
  WHERE user_id = $1
    AND factor_type = 'totp'
    AND status = 'verified';

  RETURN v_factor_count > 0;
END;
$$;

-- Create a function to enforce MFA for privileged roles
CREATE OR REPLACE FUNCTION public.require_mfa_for_privileged_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_has_mfa BOOLEAN;
BEGIN
  -- Get the user's role from profiles
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = NEW.user_id;

  -- Only enforce for admin and seller roles
  IF v_user_role IN ('ADMIN', 'SELLER') THEN
    v_has_mfa := public.has_mfa_enrolled(NEW.user_id);
    IF NOT v_has_mfa THEN
      RAISE EXCEPTION 'MFA enrollment required for admin and seller accounts';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_mfa_enrolled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_mfa_for_privileged_roles() TO authenticated;

-- Note: MFA TOTP enrollment must be enabled in Supabase Dashboard:
-- Authentication > MFA > Enable TOTP
-- Or via supabase config.toml:
-- [auth.mfa.totp]
-- enroll_enabled = true
-- verify_enabled = true
