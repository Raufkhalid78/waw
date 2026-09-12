/**
 * Provider-agnostic payment verification gate.
 *
 * A provider payment event (APG IPN, Raast webhook, any future gateway)
 * may only settle an order when the amount matches the authoritative
 * order total (within a 0.5-paisa float tolerance) and the currency is
 * PKR. Pure functions — deterministic, exported for signed-fixture testing
 * without a database.
 */

export interface PaymentVerificationResult {
  ok: boolean;
  reason?: string;
}

export function verifyProviderPaymentAgainstOrder(input: {
  providerAmount: unknown;
  providerCurrency: unknown;
  orderAmountPkr: number;
  orderPaymentStatus?: string;
  expectedCurrency?: string;
}): PaymentVerificationResult {
  const expectedCurrency = (input.expectedCurrency || "PKR").toUpperCase();

  // Already paid — idempotent no-op.
  if (input.orderPaymentStatus === "PAID") {
    return { ok: true, reason: "already_paid" };
  }

  // Amount must be a finite number matching the authoritative total.
  const providerAmount = Number(input.providerAmount);
  const orderAmount = Number(input.orderAmountPkr || 0);
  if (!Number.isFinite(providerAmount)) {
    return { ok: false, reason: "amount_missing_or_not_numeric" };
  }
  if (Math.abs(providerAmount - orderAmount) > 0.005) {
    return {
      ok: false,
      reason: `amount_mismatch: expected ${orderAmount}, received ${providerAmount}`,
    };
  }

  // Currency must be present. A MISSING currency can never be interpreted
  // as the expected currency — an unsigned-with-currency-omitted payload
  // must be rejected, not defaulted.
  if (
    input.providerCurrency === undefined ||
    input.providerCurrency === null ||
    String(input.providerCurrency).trim() === ""
  ) {
    return { ok: false, reason: "currency_missing" };
  }

  const providerCurrency = String(input.providerCurrency).trim().toUpperCase();
  if (providerCurrency !== expectedCurrency) {
    return {
      ok: false,
      reason: `currency_mismatch: expected ${expectedCurrency}, received ${providerCurrency}`,
    };
  }

  return { ok: true };
}
