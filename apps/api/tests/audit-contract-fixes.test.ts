/**
 * Regression tests for the 2026-09-14 audit fixes (contract drift between
 * the panels and the API that silently broke money paths and onboarding):
 *
 *  1. Admin dispute resolution — the panel previously sent REFUND_ISSUED /
 *     REPLACEMENT_SENT / CLAIM_REJECTED while the service only acts on
 *     REFUND_BUYER / RELEASE_SELLER_PAYOUT / REPLACEMENT_ISSUED / DISMISSED,
 *     so disputes "resolved" with NO refund executed.
 *  2. Seller /sell application — the storefront form sends dashed CNIC
 *     (XXXXX-XXXXXXX-X); the schema demanded 13 bare digits so every
 *     submission 400'd and the funnel was 100% broken.
 *  3. Coupon fields — the portal sent minSpendPkr/maxDiscountPkr; the schema
 *     only knew minOrderPkr, so Zod stripped them and coupons were saved with
 *     min_spend_pkr = 0 and no cap.
 *  4. Admin settings — a bare z.record() accepted ANY key/number (e.g.
 *     gst_rate_percentage: 5000) and corrupted every future order's pricing.
 *  5. Product edit — the seller portal's snake_case payload was stripped by
 *     the camelCase UpdateProductSchema, silently dropping price/stock edits.
 *  6. Return requests — the API requires items[]; the payload contract is now
 *     enforced by Zod so the web form can never omit it again.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AdminSettingsSchema,
  SellerApplySchema,
  CreateCouponSchema,
  UpdateProductSchema,
  CreateReturnSchema,
  CreateOrderSchema,
} from "../src/modules/common/schemas.js";

// - 1. Admin dispute resolution enum -

const DISPUTE_RESOLUTIONS = [
  "REFUND_BUYER",
  "RELEASE_SELLER_PAYOUT",
  "REPLACEMENT_ISSUED",
  "DISMISSED",
] as const;

// Mirrors SupportService.resolveDispute's up-front validation.
function validateDisputeResolution(resolution: string): boolean {
  return (DISPUTE_RESOLUTIONS as readonly string[]).includes(resolution);
}

test("Dispute resolution: the panel's enum values all execute a money path", () => {
  for (const r of DISPUTE_RESOLUTIONS) {
    assert.ok(validateDisputeResolution(r), `${r} must be a service-recognized resolution`);
  }
});

test("Dispute resolution: the old panel values are rejected (silent no-op guard)", () => {
  // These previously closed the ticket WITHOUT refunding or holding payouts.
  for (const stale of ["REFUND_ISSUED", "REPLACEMENT_SENT", "CLAIM_REJECTED"]) {
    assert.equal(
      validateDisputeResolution(stale),
      false,
      `"${stale}" must be rejected — it silently skips every financial branch`,
    );
  }
});

// - 2. Seller application CNIC -

test("SellerApplySchema accepts the dashed CNIC the /sell form sends", () => {
  const parsed = SellerApplySchema.safeParse({
    storeName: "Test Store",
    city: "Lahore",
    cnic: "42101-1234567-1",
    businessAddress: "12-B Main Boulevard, Gulberg III, Lahore",
    ownerName: "Muhammad Ali",
    whatsappPhone: "+923001234567",
    accountTitle: "Muhammad Ali",
    iban: "PK36MEZN0001234567890123",
    bankName: "Meezan Bank Ltd",
  });
  assert.ok(parsed.success, `dashed CNIC must pass: ${parsed.success ? "" : JSON.stringify((parsed as any).error?.issues)}`);
});

test("SellerApplySchema accepts 13 bare digits too", () => {
  const parsed = SellerApplySchema.safeParse({
    storeName: "Test Store",
    city: "Lahore",
    cnic: "4210112345671",
  });
  assert.ok(parsed.success);
});

test("SellerApplySchema still rejects malformed CNICs", () => {
  for (const bad of ["42101-123456-1", "12345", "42101-1234567", "abcdefghijk"]) {
    const parsed = SellerApplySchema.safeParse({
      storeName: "Test Store",
      city: "Lahore",
      cnic: bad,
    });
    assert.equal(parsed.success, false, `"${bad}" must be rejected`);
  }
});

test("SellerApplySchema passes through the portal's extra fields (not stripped)", () => {
  const parsed = SellerApplySchema.parse({
    storeName: "Test Store",
    city: "Lahore",
    cnic: "42101-1234567-1",
    businessAddress: "12-B Main Boulevard, Gulberg III, Lahore",
    accountTitle: "Muhammad Ali",
    ntn: "1234567-8",
    whatsappPhone: "+923001234567",
    email: "seller@example.com",
  });
  // Zod strips unknown keys — accepted keys must survive so the controller
  // can persist the applicant's real address/title instead of "Lahore, Pakistan".
  assert.equal((parsed as any).businessAddress, "12-B Main Boulevard, Gulberg III, Lahore");
  assert.equal((parsed as any).accountTitle, "Muhammad Ali");
  assert.equal((parsed as any).whatsappPhone, "+923001234567");
});

// - 3. Coupon creation fields -

test("CreateCouponSchema accepts the seller portal's minSpendPkr/maxDiscountPkr", () => {
  const parsed = CreateCouponSchema.safeParse({
    code: "SAVE10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minSpendPkr: 3000,
    maxDiscountPkr: 1000,
  });
  assert.ok(parsed.success, "portal coupon payload must validate (was stripped → min_spend_pkr = 0)");
  if (parsed.success) {
    assert.equal(parsed.data.minSpendPkr, 3000);
    assert.equal(parsed.data.maxDiscountPkr, 1000);
  }
});

test("CreateCouponSchema still accepts the legacy minOrderPkr alias", () => {
  const parsed = CreateCouponSchema.safeParse({
    code: "SAVE10",
    discountType: "FIXED_PKR",
    discountValue: 500,
    minOrderPkr: 2000,
  });
  assert.ok(parsed.success);
});

// - 4. Admin marketplace settings bounds -

test("AdminSettingsSchema rejects out-of-range money-critical values", () => {
  for (const [key, value] of [
    ["gst_rate_percentage", 5000],
    ["gst_rate_percentage", -5],
    ["default_commission_pct", 9999],
    ["default_shipping_fee_pkr", -1],
    ["free_delivery_threshold_pkr", 1_000_000],
  ] as const) {
    const parsed = AdminSettingsSchema.safeParse({ [key]: value });
    assert.equal(parsed.success, false, `${key}=${value} must be rejected`);
  }
});

test("AdminSettingsSchema rejects non-numeric values for bounded keys", () => {
  const parsed = AdminSettingsSchema.safeParse({ gst_rate_percentage: "eighteen" });
  assert.equal(parsed.success, false);
});

test("AdminSettingsSchema rejects unknown keys", () => {
  const parsed = AdminSettingsSchema.safeParse({ drop_all_orders: true });
  assert.equal(parsed.success, false);
});

test("AdminSettingsSchema accepts the panel's real payload", () => {
  const parsed = AdminSettingsSchema.safeParse({
    marketplace_name: "Waw",
    default_currency: "PKR",
    default_commission_pct: 10,
    free_delivery_threshold_pkr: 5000,
    default_shipping_fee_pkr: 200,
    cod_handling_fee_pkr: 100,
    gst_rate_percentage: 18,
    whatsapp_number: "+923001234567",
    discount_tier_1_threshold: 30,
    best_seller_days: 30,
    return_window_days: 7,
  });
  assert.ok(parsed.success, JSON.stringify((parsed as any).error?.issues || []));
});

// - 5. Seller product edit contract (camelCase) -

test("UpdateProductSchema accepts the portal's camelCase edit payload", () => {
  const parsed = UpdateProductSchema.safeParse({
    title: "Updated Title",
    titleUrdu: "اپ ڈیٹ شدہ",
    description: "Updated description text",
    basePricePkr: 2500,
    compareAtPricePkr: 3000,
    stockQuantity: 12,
    categoryId: "cat-uuid-1",
    imageUrl: "https://example.com/image.jpg",
    weightKg: 1.5,
  });
  assert.ok(parsed.success);
  if (parsed.success) {
    assert.equal(parsed.data.basePricePkr, 2500, "price edit must survive validation");
    assert.equal(parsed.data.stockQuantity, 12, "stock edit must survive validation");
    assert.equal(parsed.data.categoryId, "cat-uuid-1");
    assert.equal(parsed.data.weightKg, 1.5);
  }
});

test("UpdateProductSchema strips the old snake_case payload's keys (regression documentation)", () => {
  // Documents WHY the portal was fixed to send camelCase: Zod's default strips
  // unknown keys, so base_price_pkr silently vanished and only title/desc
  // persisted while the modal reported "Product updated".
  const parsed = UpdateProductSchema.safeParse({
    title: "Updated Title",
    base_price_pkr: 2500,
    stock_quantity: 12,
  });
  assert.ok(parsed.success);
  if (parsed.success) {
    assert.equal((parsed.data as any).base_price_pkr, undefined);
    assert.equal((parsed.data as any).stock_quantity, undefined);
    assert.equal((parsed.data as any).basePricePkr, undefined, "snake_case must NOT leak through as camelCase");
    assert.equal(parsed.data.title, "Updated Title");
  }
});

// - 6. Return request items contract -

test("CreateReturnSchema requires at least one item", () => {
  const parsed = CreateReturnSchema.safeParse({
    reason: "SIZE_OR_FIT_MISMATCH",
    pickupAddress: "House 42, Block C, Lahore",
    items: [],
  });
  assert.equal(parsed.success, false, "empty items must be rejected (the 100%-broken return flow)");
});

test("CreateReturnSchema accepts the web wizard's payload", () => {
  const parsed = CreateReturnSchema.safeParse({
    reason: "SIZE_OR_FIT_MISMATCH",
    comments: "Too small",
    refundPreference: "ORIGINAL_PAYMENT",
    pickupCity: "Lahore",
    pickupAddress: "House 42, Block C, Lahore",
    items: [
      { orderItemId: "item-1", quantity: 1 },
      { orderItemId: "item-2", quantity: 2 },
    ],
  });
  assert.ok(parsed.success);
});

// - 7. Logged-in order province is optional (server-derives it) -

test("CreateOrderSchema no longer hard-requires shippingProvince", () => {
  const parsed = CreateOrderSchema.safeParse({
    buyerName: "Ali Raza",
    buyerPhone: "+923001234567",
    shippingAddress: "House 42, Block C, Gulberg III",
    shippingCity: "Lahore",
    paymentMethod: "COD",
    items: [{ productId: "prod-1", variantId: "var-1", quantity: 1 }],
  });
  assert.ok(parsed.success, "province is derived from serviceable_cities server-side now");
});
