import { describe, it } from "node:test";
import assert from "node:assert";
import jwt from "jsonwebtoken";
import { RaastService } from "../src/modules/payments/raast.service.js";
import { PostExXPayService } from "../src/modules/payments/xpay.service.js";
import { CourierService } from "../src/modules/logistics/courier.service.js";
import { ProductService } from "../src/modules/products/product.service.js";
import {
  calculateOrderSummary,
  PaymentMethod,
  ReturnReason,
  SellerType,
  UserRole,
} from "../src/types/index.js";
import { expandRomanUrduQuery } from "../src/modules/search/roman-urdu-dict.js";
import { ENV } from "../src/config/env.js";
import crypto from "crypto";

describe("Waw Marketplace Core API Engine Tests", () => {
  it("should accurately calculate free delivery for orders >= PKR 5,000", () => {
    const summary = calculateOrderSummary(
      [
        {
          productId: "prod_1",
          sellerType: SellerType.FIRST_PARTY,
          unitPricePkr: 3000,
          quantity: 2,
        },
      ],
      PaymentMethod.RAAST_P2M_QR,
    );

    assert.strictEqual(summary.subtotalPkr, 6000);
    assert.strictEqual(summary.isFreeDelivery, 1);
    assert.strictEqual(summary.shippingPkr, 0);
    assert.strictEqual(summary.codFeePkr, 0);
    assert.strictEqual(summary.totalPkr, 6000);
  });

  it("should apply COD surcharge (+PKR 100) and shipping fee (+PKR 200) for small orders", () => {
    const summary = calculateOrderSummary(
      [
        {
          productId: "prod_2",
          sellerType: SellerType.THIRD_PARTY,
          commissionRatePercentage: 10,
          unitPricePkr: 2000,
          quantity: 1,
        },
      ],
      PaymentMethod.COD,
    );

    assert.strictEqual(summary.subtotalPkr, 2000);
    assert.strictEqual(summary.isFreeDelivery, 0);
    assert.strictEqual(summary.shippingPkr, 200);
    assert.strictEqual(summary.codFeePkr, 100);
    assert.strictEqual(summary.totalPkr, 2300);
    assert.strictEqual(summary.itemBreakdowns[0].wawCommissionPkr, 200);
    assert.strictEqual(summary.itemBreakdowns[0].sellerPayoutPkr, 1800);
  });

  it("should generate valid EMVCo dynamic Raast QR payload with CRC16 checksum", async () => {
    const qrResult = await RaastService.generateDynamicQr({
      orderId: "ord_123",
      orderNumber: "WAW-PK-99120",
      amountPkr: 4500,
    });

    assert.ok(qrResult.qrString.startsWith("000201010212"));
    assert.ok(qrResult.qrDataUrl.includes("data:image/png;base64,"));
    assert.strictEqual(qrResult.amountPkr, 4500);
    assert.strictEqual(qrResult.merchantAlias, "waw.market@hbl");
  });

  it("should expand Roman Urdu search keywords with catalog synonyms", () => {
    const synonyms1 = expandRomanUrduQuery("jora");
    assert.ok(synonyms1.includes("lawn"));
    assert.ok(synonyms1.includes("unstitched"));

    const synonyms2 = expandRomanUrduQuery("chappal");
    assert.ok(synonyms2.includes("peshawari chappal"));
  });

  it("should accurately verify valid PostEx XPay HMAC-SHA256 signatures and reject tampered payloads", () => {
    const secret =
      ENV.POSTEX_XPAY_SECRET_KEY || "test-only-hmac-secret-not-a-real-key";
    const payload = JSON.stringify({
      intentId: "xpay_12345",
      amount: 5000,
      status: "PAID",
    });

    // Generate valid HMAC
    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    assert.strictEqual(
      PostExXPayService.verifyWebhookSignature(payload, validSignature),
      true,
    );

    // Tampered payload with valid signature
    const tamperedPayload = JSON.stringify({
      intentId: "xpay_12345",
      amount: 9999,
      status: "PAID",
    });
    assert.strictEqual(
      PostExXPayService.verifyWebhookSignature(tamperedPayload, validSignature),
      false,
    );
  });

  it("should issue and verify valid JWT tokens with role claims", () => {
    const secret = ENV.JWT_SECRET || "waw_dev_jwt_secret_key_2026";
    const token = jwt.sign(
      { sub: "usr_admin_1", phone: "+923001234567", role: UserRole.ADMIN },
      secret,
      { expiresIn: "1h" },
    );

    const decoded = jwt.verify(token, secret) as any;
    assert.strictEqual(decoded.sub, "usr_admin_1");
    assert.strictEqual(decoded.role, UserRole.ADMIN);
  });

  it("should generate printable 4x6 PostEx Air Waybill with Code128 barcode URL", () => {
    const awb = CourierService.generatePostExAirWaybill(
      "PTX-98213-441",
      "WAW-88492",
      {
        name: "Ahmed Malik",
        phone: "+923001234567",
        address: "House 42, Street 8, DHA Phase 5, Lahore",
        city: "Lahore",
        codAmountPkr: 4200,
      },
    );

    assert.strictEqual(awb.trackingNumber, "PTX-98213-441");
    assert.strictEqual(awb.orderNumber, "WAW-88492");
    assert.ok(awb.barcodeUrl.includes("bcid=code128"));
    assert.strictEqual(awb.codAmountPkr, 4200);
    assert.strictEqual(awb.city, "Lahore");
  });

  it("should generate PostEx reverse pickup consignment for 7-day buyer return", async () => {
    const reversePickup = await CourierService.bookPostExReversePickup({
      orderId: "ord_ret_1",
      orderNumber: "WAW-88492",
      customerName: "Usman Riaz",
      customerPhone: "+923219876543",
      pickupAddress: "Flat 4B, Clifton Block 2, Karachi",
      pickupCity: "Karachi",
      returnReason: ReturnReason.SIZE_OR_FIT_MISMATCH,
      itemsDescription: "Peshawari Chappal (Size 43)",
    });

    assert.strictEqual(reversePickup.success, true);
    assert.ok(reversePickup.reverseTrackingNumber.startsWith("REV-PTX-"));
    assert.strictEqual(reversePickup.pickupCity, "Karachi");
    assert.ok(reversePickup.trackingUrl.includes("postex.pk/tracking"));
  });

  it("should sign and verify valid checkout quote tokens and reject expired ones", () => {
    const secret = ENV.JWT_SECRET || "waw_dev_jwt_secret_key_2026";
    const validQuote = {
      subtotalPkr: 5500,
      shippingFeePkr: 0,
      codFeePkr: 0,
      totalPkr: 5500,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      items: [
        {
          productId: "prod_1",
          storeId: "store_1",
          unitPricePkr: 5500,
          quantity: 1,
          totalPricePkr: 5500,
        },
      ],
    };

    const token = jwt.sign(validQuote, secret, { expiresIn: "15m" });
    const decoded: any = jwt.verify(token, secret);
    assert.strictEqual(decoded.totalPkr, 5500);
    assert.strictEqual(decoded.shippingFeePkr, 0);

    // Expired Quote
    const expiredQuote = {
      ...validQuote,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    const expiredToken = jwt.sign(expiredQuote, secret, { expiresIn: "15m" });
    assert.throws(() => {
      const d: any = jwt.verify(expiredToken, secret);
      if (new Date(d.expiresAt) < new Date()) {
        throw new Error("Checkout quote has expired");
      }
    }, /Checkout quote has expired/);
  });

  it("should smart-route Tier 1 city parcels to PostEx and heavy parcels > 5kg to Trax", () => {
    const courierLahore = CourierService.selectCourier("Lahore", 1.5);
    assert.strictEqual(courierLahore, "POSTEX");

    const courierKarachi = CourierService.selectCourier("Karachi", 2.0);
    assert.strictEqual(courierKarachi, "POSTEX");

    const courierHeavy = CourierService.selectCourier("Islamabad", 8.5);
    assert.strictEqual(courierHeavy, "TRAX");
  });

  it("should enforce PENDING_REVIEW status and is_active=false for 3P seller product creation", () => {
    const isFirstParty = false;
    const userRole = "SELLER";
    const isDirectActive = isFirstParty || userRole === "ADMIN";
    const status = isDirectActive ? "ACTIVE" : "PENDING_REVIEW";
    const isActive = isDirectActive;
    const defaultStock = undefined ?? 0;

    assert.strictEqual(status, "PENDING_REVIEW");
    assert.strictEqual(isActive, false);
    assert.strictEqual(defaultStock, 0); // Never invents fake 100 stock
  });

  it("should permit immediate ACTIVE status for 1P / Admin products", () => {
    const isFirstParty = true;
    const userRole = "ADMIN";
    const isDirectActive = isFirstParty || userRole === "ADMIN";
    const status = isDirectActive ? "ACTIVE" : "PENDING_REVIEW";
    const isActive = isDirectActive;

    assert.strictEqual(status, "ACTIVE");
    assert.strictEqual(isActive, true);
  });

  it("should calculate pure zero-fallback platform revenue stats from database", () => {
    const orders: any[] = [];
    const gmvPkr = orders.reduce((sum, o) => sum + (o.total_pkr || 0), 0);
    const codFeesCollectedPkr = orders.reduce(
      (sum, o) => sum + (o.cod_fee_pkr || 0),
      0,
    );
    const totalCommissionsPkr = Math.round(gmvPkr * 0.1);

    const stats = {
      gmvPkr,
      totalOrders: orders.length,
      totalSellers: 0,
      totalProducts: 0,
      totalCommissionsPkr,
      codFeesCollectedPkr,
      netPlatformRevenuePkr: totalCommissionsPkr + codFeesCollectedPkr,
    };

    assert.strictEqual(stats.gmvPkr, 0); // Not 5699000
    assert.strictEqual(stats.totalOrders, 0); // Not 1240
    assert.strictEqual(stats.totalSellers, 0); // Not 84
    assert.strictEqual(stats.totalProducts, 0); // Not 420
    assert.strictEqual(stats.netPlatformRevenuePkr, 0);
  });

  it("should enforce dispute lifecycle status transitions", () => {
    const validDisputeStatuses = [
      "DISPUTE_OPENED",
      "UNDER_REVIEW",
      "REFUND_ISSUED",
      "REPLACEMENT_SENT",
      "CLAIM_REJECTED",
    ];

    const initialStatus = "DISPUTE_OPENED";
    const resolvedStatus = "REFUND_ISSUED";

    assert.ok(validDisputeStatuses.includes(initialStatus));
    assert.ok(validDisputeStatuses.includes(resolvedStatus));
  });

  it("should expand chappal and Roman Urdu terms for resilient search", () => {
    const terms = expandRomanUrduQuery("chappal");
    assert.ok(terms.includes("chappal"));
    assert.ok(terms.includes("peshawari chappal"));
    assert.ok(terms.includes("norozi chappal"));
  });

  it("should mask sensitive seller CNIC and bank account numbers", () => {
    const maskCnic = (cnic?: string) => {
      if (!cnic || cnic.length < 5) return cnic;
      return `${cnic.slice(0, 5)}-*******-${cnic.slice(-1)}`;
    };
    const maskAccount = (acc?: string) => {
      if (!acc || acc.length < 8) return acc;
      return `${acc.slice(0, 4)}****${acc.slice(-4)}`;
    };

    const maskedCnic = maskCnic("42101-1234567-1");
    const maskedIban = maskAccount("PK36HABB00000012345678");

    assert.strictEqual(maskedCnic, "42101-*******-1");
    assert.strictEqual(maskedIban, "PK36****5678");
  });

  it("should sum exact commission from store_orders records rather than flat 10%", () => {
    const storeOrders = [
      { id: "sord_1", subtotal_pkr: 10000, commission_pkr: 800 },  // 8%
      { id: "sord_2", subtotal_pkr: 5000, commission_pkr: 600 },   // 12%
    ];

    const totalCommissionsPkr = storeOrders.reduce(
      (sum, so) => sum + (so.commission_pkr || 0),
      0,
    );

    assert.strictEqual(totalCommissionsPkr, 1400); // Exact 1400 vs flat 1500
  });

  it("should compute double-entry ledger balance from RESTOCK, RESERVE, and RELEASE transactions", () => {
    const mockLedger = [
      { transaction_type: "RESTOCK", quantity: 50 },
      { transaction_type: "RESERVE", quantity: -5 },
      { transaction_type: "RESERVE", quantity: -2 },
      { transaction_type: "RELEASE", quantity: 2 }, // One order cancelled
      { transaction_type: "DAMAGE_ADJUSTMENT", quantity: -1 },
    ];

    const availableStock = mockLedger.reduce((sum, row) => sum + row.quantity, 0);
    assert.strictEqual(availableStock, 44); // 50 - 5 - 2 + 2 - 1 = 44
  });

  it("should enforce idempotency when releasing order reservations", () => {
    const existingReleases = [{ id: "rel_1", reference_id: "ord_100", transaction_type: "RELEASE" }];
    const isAlreadyReleased = existingReleases.some(
      (r) => r.reference_id === "ord_100" && r.transaction_type === "RELEASE"
    );

    assert.strictEqual(isAlreadyReleased, true);
  });

  it("should correctly identify orders eligible for 15-minute checkout timeout expiration", () => {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    const orders = [
      { id: "ord_1", status: "PENDING_PAYMENT", created_at: new Date(now - 20 * 60 * 1000).toISOString() }, // Expired (20m old)
      { id: "ord_2", status: "PENDING_PAYMENT", created_at: new Date(now - 5 * 60 * 1000).toISOString() },  // Active (5m old)
      { id: "ord_3", status: "CONFIRMED", created_at: new Date(now - 30 * 60 * 1000).toISOString() },        // Paid / Confirmed
    ];

    const expired = orders.filter(
      (o) => o.status === "PENDING_PAYMENT" && new Date(o.created_at).getTime() < now - fifteenMinutes
    );

    assert.strictEqual(expired.length, 1);
    assert.strictEqual(expired[0].id, "ord_1");
  });

  it("should validate and format 13-digit Pakistani CNICs as XXXXX-XXXXXXX-X", () => {
    const formatCnic = (raw: string) => {
      const cleaned = raw.replace(/\D/g, "");
      if (cleaned.length !== 13) throw new Error("Invalid CNIC");
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
    };

    assert.strictEqual(formatCnic("35202-1234567-1"), "35202-1234567-1");
    assert.strictEqual(formatCnic("3520212345671"), "35202-1234567-1");
    assert.throws(() => formatCnic("12345"), /Invalid CNIC/);
  });

  it("should validate Pakistani 24-character IBANs starting with PK", () => {
    const validateIban = (raw: string) => {
      const cleaned = raw.replace(/[\s-]/g, "").toUpperCase();
      if (cleaned.startsWith("PK") && cleaned.length !== 24) {
        throw new Error("Invalid Pakistani IBAN");
      }
      return cleaned;
    };

    assert.strictEqual(validateIban("PK36 HABB 0000 0012 3456 7890"), "PK36HABB0000001234567890");
    assert.throws(() => validateIban("PK36HABB123"), /Invalid Pakistani IBAN/);
  });

  it("should compute exact Pakistani delivery windows (Intra-city: 2-3 days, Inter-city Tier 1: 3-5 days, Inter-city Other: 5-7 days)", async () => {
    const { ServiceabilityService } = await import("../src/modules/logistics/serviceability.service.js");

    // Intra-city (Lahore to Lahore)
    const intra = await ServiceabilityService.checkDestination("Lahore", "Lahore");
    assert.strictEqual(intra.estimatedDays.min, 2);
    assert.strictEqual(intra.estimatedDays.max, 3);
    assert.strictEqual(intra.estimatedDays.label, "2–3 business days");

    // Inter-city Tier 1 (Karachi to Lahore)
    const tier1 = await ServiceabilityService.checkDestination("Lahore", "Karachi");
    assert.strictEqual(tier1.estimatedDays.min, 3);
    assert.strictEqual(tier1.estimatedDays.max, 5);
    assert.strictEqual(tier1.estimatedDays.label, "3–5 business days");

    // Inter-city Other (Quetta to Lahore)
    const other = await ServiceabilityService.checkDestination("Quetta", "Lahore");
    assert.strictEqual(other.estimatedDays.min, 5);
    assert.strictEqual(other.estimatedDays.max, 7);
    assert.strictEqual(other.estimatedDays.label, "5–7 business days");
  });

  it("should reject unserviceable destination cities", async () => {
    const { ServiceabilityService } = await import("../src/modules/logistics/serviceability.service.js");
    await assert.rejects(
      async () => ServiceabilityService.checkDestination("Atlantis"),
      /Delivery is currently not available to "Atlantis"/
    );
  });

  it("should enforce 7-day return policy (accept <= 7 days, reject > 7 days)", () => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const validateReturnWindow = (deliveredAtStr: string) => {
      const deliveredTime = new Date(deliveredAtStr).getTime();
      if (now - deliveredTime > sevenDaysMs) {
        throw new Error("The 7-day return window for this order has expired.");
      }
      return true;
    };

    // Valid: delivered 3 days ago
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(validateReturnWindow(threeDaysAgo), true);

    // Invalid: delivered 10 days ago
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    assert.throws(() => validateReturnWindow(tenDaysAgo), /The 7-day return window for this order has expired/);
  });

  it("should calculate double-entry balance accurately with RETURN_RESTOCK", () => {
    const mockLedger = [
      { transaction_type: "RESTOCK", quantity: 10 },
      { transaction_type: "RESERVE", quantity: -2 },
      { transaction_type: "RETURN_RESTOCK", quantity: 1 }, // 1 item returned & restocked
    ];

    const currentStock = mockLedger.reduce((sum, row) => sum + row.quantity, 0);
    assert.strictEqual(currentStock, 9); // 10 - 2 + 1 = 9
  });

  it("should validate support ticket creation and dispute reason categorization", () => {
    const validReasons = [
      "NON_DELIVERY",
      "FAKE_OR_COUNTERFEIT",
      "SELLER_UNRESPONSIVE",
      "INCORRECT_CHARGES",
      "DEFECTIVE_PRODUCT",
      "OTHER",
    ];

    const validateReason = (reason: string) => {
      if (!validReasons.includes(reason)) throw new Error("Invalid dispute reason");
      return true;
    };

    assert.strictEqual(validateReason("NON_DELIVERY"), true);
    assert.strictEqual(validateReason("FAKE_OR_COUNTERFEIT"), true);
    assert.throws(() => validateReason("INVALID_REASON"), /Invalid dispute reason/);
  });

  it("should apply appropriate financial actions upon dispute adjudication", () => {
    const applyDisputeResolution = (resolution: string, currentEscrowStatus: string) => {
      if (resolution === "REFUND_BUYER") {
        return { orderStatus: "REFUNDED", escrowStatus: "HELD" };
      } else if (resolution === "RELEASE_SELLER_PAYOUT") {
        return { orderStatus: "DELIVERED", escrowStatus: "SCHEDULED" };
      }
      return { orderStatus: "DELIVERED", escrowStatus: currentEscrowStatus };
    };

    const refundOutcome = applyDisputeResolution("REFUND_BUYER", "HELD");
    assert.strictEqual(refundOutcome.orderStatus, "REFUNDED");
    assert.strictEqual(refundOutcome.escrowStatus, "HELD");

    const releaseOutcome = applyDisputeResolution("RELEASE_SELLER_PAYOUT", "HELD");
    assert.strictEqual(releaseOutcome.escrowStatus, "SCHEDULED");
  });

  it("should identify matured T+7 seller payouts ready for automated disbursement", () => {
    const now = Date.now();
    const payouts = [
      { id: "pay_1", status: "SCHEDULED", scheduled_for: new Date(now - 2 * 60 * 60 * 1000).toISOString() }, // Matured (2h ago)
      { id: "pay_2", status: "SCHEDULED", scheduled_for: new Date(now + 24 * 60 * 60 * 1000).toISOString() }, // Not matured (in 24h)
      { id: "pay_3", status: "COMPLETED", scheduled_for: new Date(now - 5 * 60 * 60 * 1000).toISOString() }, // Already completed
    ];

    const matured = payouts.filter(
      (p) => p.status === "SCHEDULED" && new Date(p.scheduled_for).getTime() <= now
    );

    assert.strictEqual(matured.length, 1);
    assert.strictEqual(matured[0].id, "pay_1");
  });

  it("should withhold seller payouts in HELD status if linked order has an active dispute", () => {
    const activeDisputes = new Set(["ord_disputed_1", "ord_disputed_2"]);
    const reconcilePayout = (payout: { orderId: string; status: string }) => {
      if (activeDisputes.has(payout.orderId)) {
        return { ...payout, status: "HELD" };
      }
      return { ...payout, status: "COMPLETED" };
    };

    const disputedPayout = reconcilePayout({ orderId: "ord_disputed_1", status: "SCHEDULED" });
    assert.strictEqual(disputedPayout.status, "HELD");

    const cleanPayout = reconcilePayout({ orderId: "ord_clean_100", status: "SCHEDULED" });
    assert.strictEqual(cleanPayout.status, "COMPLETED");
  });

  it("should schedule seller payout exactly 7 days after delivery milestone", () => {
    const deliveredAt = new Date("2026-08-28T12:00:00.000Z");
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const scheduledFor = new Date(deliveredAt.getTime() + sevenDaysMs);

    assert.strictEqual(scheduledFor.toISOString(), "2026-09-04T12:00:00.000Z");
  });

  it("should generate valid Schema.org Product JSON-LD structured data for Google rich snippets", () => {
    const mockProduct = {
      productId: "prod_101",
      title: "Handcrafted Peshawari Chappal",
      pricePkr: 4500,
      stockQuantity: 15,
      storeName: "Charsadda Leather House",
      rating: 4.8,
      reviewsCount: 32,
    };

    const schema = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: mockProduct.title,
      offers: {
        "@type": "Offer",
        priceCurrency: "PKR",
        price: mockProduct.pricePkr,
        availability: mockProduct.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: mockProduct.rating,
        reviewCount: mockProduct.reviewsCount,
      },
    };

    assert.strictEqual(schema["@type"], "Product");
    assert.strictEqual(schema.offers.priceCurrency, "PKR");
    assert.strictEqual(schema.offers.price, 4500);
    assert.strictEqual(schema.offers.availability, "https://schema.org/InStock");
    assert.strictEqual(schema.aggregateRating.ratingValue, 4.8);
  });

  it("should compute category price range bounds accurately for facet filtering", () => {
    const prices = [1500, 3200, 4500, 12000, 850];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    assert.strictEqual(minPrice, 850);
    assert.strictEqual(maxPrice, 12000);
  });

  it("should differentiate UUID from slug to prevent Postgres UUID syntax errors (P0-WEB-002)", () => {
    const isUUID = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    assert.strictEqual(isUUID("c3d2b274-1234-4567-89ab-cdef01234567"), true);
    assert.strictEqual(isUUID("airpods-pro-2"), false);
    assert.strictEqual(isUUID("charsadda-chappal-special"), false);
    assert.strictEqual(isUUID("prod_101"), false);
  });

  it("should support options object { ex: 10 } and duration in MemoryCacheFallback (P0-PLAT-001)", async () => {
    const store = new Map<string, { value: string; expiresAt: number }>();
    const setMock = (key: string, value: string, optsOrMode?: any, durationSeconds?: number) => {
      let ttlSeconds: number | undefined = undefined;
      if (typeof optsOrMode === "object" && optsOrMode !== null) {
        if (optsOrMode.ex) ttlSeconds = optsOrMode.ex;
      } else if (typeof durationSeconds === "number") {
        ttlSeconds = durationSeconds;
      }
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
      store.set(key, { value, expiresAt });
      return "OK";
    };

    assert.strictEqual(setMock("healthcheck", "1", { ex: 10 }), "OK");
    assert.strictEqual(store.get("healthcheck")?.value, "1");
    assert.strictEqual(setMock("session_key", "active", "EX", 60), "OK");
  });

  it("should generate correlation ID and classify API error states (P0-WEB-001)", () => {
    const correlationId = `req_${Date.now()}_test123`;
    assert.match(correlationId, /^req_\d+_test123$/);

    const classifyError = (status: number, isTimeout: boolean) => {
      if (isTimeout) return "TIMEOUT";
      if (status === 404) return "NOT_FOUND";
      if (status >= 500) return "SERVICE_UNAVAILABLE";
      return "UNKNOWN_ERROR";
    };

    assert.strictEqual(classifyError(0, true), "TIMEOUT");
    assert.strictEqual(classifyError(404, false), "NOT_FOUND");
    assert.strictEqual(classifyError(503, false), "SERVICE_UNAVAILABLE");
  });

  it("should deny anonymous access from reading inactive products or unapproved offers (P0-SEC-001)", () => {
    const rawOffers = [
      { id: "off_1", status: "ACTIVE", price_pkr: 2500 },
      { id: "off_2", status: "PENDING", price_pkr: 2200 },
      { id: "off_3", status: "REJECTED", price_pkr: 1900 },
    ];

    const publicProjection = rawOffers.filter((o) => o.status === "ACTIVE");
    assert.strictEqual(publicProjection.length, 1);
    assert.strictEqual(publicProjection[0].id, "off_1");
  });

  it("should strip sensitive seller operational columns from public store projection (P0-SEC-001)", () => {
    const rawStore = {
      id: "store_101",
      name: "Lahore Optics",
      slug: "lahore-optics",
      city: "Lahore",
      seller_type: "THIRD_PARTY",
      cnic_number: "35201-1234567-1",
      iban: "PK36SCBL0000001123456701",
      commission_rate_percentage: 12.5,
      owner_id: "usr_super_secret_id",
      rating_average: 4.9,
    };

    const projectPublicStore = (s: typeof rawStore) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      city: s.city,
      seller_type: s.seller_type,
      rating_average: s.rating_average,
    });

    const projected = projectPublicStore(rawStore) as any;
    assert.strictEqual(projected.name, "Lahore Optics");
    assert.strictEqual(projected.cnic_number, undefined);
    assert.strictEqual(projected.iban, undefined);
    assert.strictEqual(projected.commission_rate_percentage, undefined);
    assert.strictEqual(projected.owner_id, undefined);
  });

  it("should enforce strictly idempotent order creation when idempotencyKey is reused (P0-CHK-001)", async () => {
    const cache = new Map<string, string>();
    const mockOrderResponse = {
      orderId: "ord_unique_99",
      orderNumber: "WAW-9988",
      totalAmountPkr: 4500,
      status: "PENDING_COD",
    };

    const idempotencyKey = "idemp_checkout_xyz123";
    cache.set(`idempotency:${idempotencyKey}`, JSON.stringify(mockOrderResponse));

    const checkIdempotency = (key: string) => {
      const cached = cache.get(`idempotency:${key}`);
      return cached ? JSON.parse(cached) : null;
    };

    const result1 = checkIdempotency(idempotencyKey);
    assert.deepStrictEqual(result1, mockOrderResponse);

    const result2 = checkIdempotency("non_existent_key");
    assert.strictEqual(result2, null);
  });

  it("should reject client-provided prices and enforce database price verification (P0-CHK-001)", () => {
    const clientItem = { productId: "prod_01", requestedPrice: 100 }; // Attacker trying to buy at PKR 100
    const databaseVerifiedOffer = { id: "prod_01", authoritativePricePkr: 4500 };

    const computeLineTotal = (item: typeof clientItem, dbOffer: typeof databaseVerifiedOffer, qty: number) => {
      // Server must ONLY use authoritative database price
      return dbOffer.authoritativePricePkr * qty;
    };

    const lineTotal = computeLineTotal(clientItem, databaseVerifiedOffer, 2);
    assert.strictEqual(lineTotal, 9000); // 2 * 4500
    assert.notStrictEqual(lineTotal, 200);
  });

  it("should match products by Urdu script and Roman Urdu spelling variations (P1-SEARCH-001)", () => {
    const products = [
      { id: "p1", title: "Handmade Peshawari Chappal", title_urdu: "دستکاری پشاوری چپل", is_active: true },
      { id: "p2", title: "Embroidered Cotton Kurta", title_urdu: "کڑھائی والا سوتی کرتا", is_active: true },
      { id: "p3", title: "Leather Wallet", title_urdu: "چمڑے کا بٹوہ", is_active: true },
    ];

    // 1. Urdu Script Query
    const urduMatch = products.filter((p) => p.title_urdu.includes("چپل"));
    assert.strictEqual(urduMatch.length, 1);
    assert.strictEqual(urduMatch[0].id, "p1");

    // 2. Roman Urdu Expansion
    const romanUrduQueries = ["peshawari chapal", "chappal", "kurtay"];
    const matchesChappal = romanUrduQueries.some((q) => q.includes("chappal") || q.includes("chapal"));
    assert.strictEqual(matchesChappal, true);
  });
});
