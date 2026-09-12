-- ==============================================================================
-- 050: Bank Alfalah APG payment methods
-- ==============================================================================
-- Adds the Bank Alfalah Alfa Payment Gateway methods to the PaymentMethod
-- enum so orders/payments can be placed with:
--   ALFA_WALLET      (onsite OTP checkout — buyer never leaves waw.com.pk)
--   ALFALAH_ACCOUNT  (onsite OTAC checkout)
--   ALFA_CARD        (APG hosted card page)
--
-- The legacy XPAY_* values are NOT removed: Postgres does not support
-- dropping enum values, and historical rows must remain readable. New
-- orders can no longer be created with them (API zod schemas reject them).
--
-- NOTE (PG12+): ALTER TYPE ... ADD VALUE may run in a transaction, but the
-- new values cannot be USED (compared/cast) in the same transaction. This
-- migration only adds them; application usage happens afterwards.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ALFA_WALLET';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ALFALAH_ACCOUNT';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ALFA_CARD';
