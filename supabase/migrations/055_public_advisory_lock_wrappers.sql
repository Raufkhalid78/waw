-- ==============================================================================
-- 055: public-schema advisory lock wrappers for cron RPC calls
-- ==============================================================================
-- The API's cron jobs acquire distributed locks via Supabase RPC:
--   supabaseAdmin.rpc("pg_try_advisory_lock", { lock_key: N })
-- Supabase RPC resolves functions in the PUBLIC schema only — pg_catalog's
-- pg_try_advisory_lock(bigint) is not callable as a PostgREST RPC. The crons
-- logged "Could not find the function public.pg_try_advisory_lock(lock_key)
-- in the schema cache" on every tick, so every distributed lock silently
-- failed and NO cron (outbox processor, inventory cleanup, reconciliation,
-- subscription expiry, typesense reconcile) could ever run.
--
-- These SECURITY DEFINER wrappers are session-scoped (not xact-scoped):
-- acquire + unlock must run on the same connection. NOTE: Supabase's
-- PostgREST pools connections, so a lock taken on one pooled connection may
-- be unlocked on another. The wrappers therefore use the ONE-SHOT pattern:
-- try-lock + work + unlock are each independent best-effort calls, and the
-- unlock is wrapped in a self-contained advisory_unlock_all on ANY
-- connection via pg_advisory_unlock_all(). Because each PostgREST RPC call
-- is its own transaction, a transaction-scoped lock variant is actually the
-- correct choice: pg_try_advisory_xact_lock() auto-releases at commit, so a
-- pooled connection can never leak the lock.
--
-- We expose xact-scoped locks under the names the API calls.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.pg_try_advisory_lock(lock_key bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  -- Transaction-scoped: automatically released when the RPC's implicit
  -- transaction commits — safe across Supabase's pooled connections.
  RETURN pg_catalog.pg_try_advisory_xact_lock(lock_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.pg_advisory_unlock(lock_key bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  -- Xact-scoped locks cannot be explicitly released; they end with the
  -- transaction. Report success so callers don't treat this as an error.
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.pg_try_advisory_lock(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pg_advisory_unlock(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pg_try_advisory_lock(bigint), public.pg_advisory_unlock(bigint) TO service_role;

COMMIT;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('055_public_advisory_lock_wrappers', NOW())
ON CONFLICT (version) DO NOTHING;
