-- 000_supabase_compat_shims.sql
-- Plain-Postgres compatibility shims so the migration set can be applied to
-- non-Supabase databases (CI service containers, local dev). On a real
-- Supabase database the auth schema already exists and this file is a no-op.
--
-- Semantics mirror Supabase: auth.uid()/auth.role() read the JWT claims that
-- PostgREST exposes via the `request.jwt.claims` GUC. Outside an HTTP request
-- (direct SQL, tests, crons) they resolve to NULL/'anon', matching Supabase's
-- behavior for unauthenticated sessions.
DO $shim$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    RAISE NOTICE 'auth schema already present (real Supabase) — skipping compat shims';
    RETURN;
  END IF;

  CREATE SCHEMA auth;

  -- PostgREST role names that Supabase provisions and the RLS policies and
  -- grants throughout the migration set reference.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  -- Minimal auth.users mirror. Only the columns seeded by supabase/seed.sql
  -- and read by the runtime schema are included.
  CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    email TEXT,
    phone TEXT,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
      SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb)
    $$;

  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
      SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid
    $$;

  CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
      SELECT COALESCE(auth.jwt() ->> 'role', 'anon')
    $$;

  GRANT USAGE ON SCHEMA auth TO PUBLIC;
  GRANT SELECT ON auth.users TO PUBLIC;
END
$shim$;
