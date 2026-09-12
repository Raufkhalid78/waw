-- ==============================================================================
-- 051: Runtime column reconciliation (schema audit fixes)
-- ==============================================================================
-- Two columns the API uses that no prior migration defined:
--
--   1. profiles.is_banned — auth.middleware.ts selects it on EVERY request and
--      AdminService.banUser/unbanUser writes it. On a database built purely
--      from migrations 000-050, the select errors silently (ban check no-ops)
--      and the admin ban/unban routes fail with PGRST204.
--
--   2. order_items.price_pkr — NOT NULL with no default (001). The checkout
--      RPCs (checkout_transaction 035, guest_checkout_transaction 019) INSERT
--      order_items writing unit_price_pkr / total_price_pkr but omitting the
--      legacy price_pkr column, so every checkout fails with a NOT NULL
--      violation on a fresh database. Nothing reads order_items.price_pkr
--      (returns/refunds/commissions all use unit_price_pkr), so a 0 default
--      is safe; the chk_order_items_price_non_negative constraint (>= 0)
--      remains satisfied.
--
-- Both changes are additive and idempotent: safe on fresh databases (CI E2E
-- via supabase db reset) and on existing staging databases (supabase db push).
-- ==============================================================================

-- 1. Ban flag read by the auth middleware on every authenticated request
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: is_active=false rows are historical bans — mirror them so the
-- middleware's ban enforcement actually applies to previously disabled users.
UPDATE public.profiles SET is_banned = TRUE WHERE is_active = FALSE AND is_banned = FALSE;

-- 2. Legacy order_items.price_pkr — give it a default so checkout RPCs that
--    intentionally write unit_price_pkr/total_price_pkr can omit it.
ALTER TABLE public.order_items
  ALTER COLUMN price_pkr SET DEFAULT 0;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('051_add_missing_columns', NOW())
ON CONFLICT (version) DO NOTHING;
