import crypto from "crypto";
import axios from "axios";
import { ENV } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { supabaseAdmin } from "../../config/supabase.js";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../types/index.js";
import { InventoryLockService } from "../products/inventory-lock.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import { verifyProviderPaymentAgainstOrder } from "./payment-verification.js";

/**
 * Bank Alfalah — Alfa Payment Gateway (APG) integration.
 *
 * Onsite checkout (no page redirect) for:
 *   - Alfa Wallet        (TransactionTypeId = 1, customer enters wallet
 *                          number + 8-digit SMSOTP on OUR checkout page)
 *   - Alfalah Account    (TransactionTypeId = 2, customer enters account
 *                          number + 4-digit SMSOTAC/EmailOTAC on OUR page)
 * Hosted-page redirect for:
 *   - Credit/Debit Card  (TransactionTypeId = 3 — cards are never processed
 *                          on merchant pages per PCI rules)
 *
 * Flow (REST, per APG Merchant Integration Guide v1.1):
 *   1. Handshake  (HS/api/HSAPI/HSAPI)      -> AuthToken
 *   2. Initiate   (HS/api/Tran/DoTran)      -> HashKey + IsOTP flag
 *   3. Process    (HS/api/ProcessTran/ProTran) -> final payment result
 *   4. Verify     (HS/api/IPN/OrderStatus/...)  -> authoritative settlement
 *
 * RequestHash: AES-128-CBC(Key1=key, Key2=iv) over the exact ordered
 * key=value map string, base64-encoded. APG responses arrive
 * double-JSON-encoded (a JSON string containing a JSON string).
 *
 * SECURITY: the client only ever sees AuthToken/HashKey (short-lived opaque
 * strings). Merchant credentials and AES keys NEVER leave the server.
 */

export const APG_TRANSACTION_TYPE = {
  ALFA_WALLET: "1",
  ALFALAH_ACCOUNT: "2",
  CARD: "3",
} as const;

const API_CHANNEL = "1002"; // REST API channel
const REDIRECTION_CHANNEL = "1001"; // hosted-page channel

const APG_URLS = {
  sandbox: {
    handshake: "https://sandbox.bankalfalah.com/HS/api/HSAPI/HSAPI",
    doTran: "https://sandbox.bankalfalah.com/HS/api/Tran/DoTran",
    proTran: "https://sandbox.bankalfalah.com/HS/api/ProcessTran/ProTran",
    sso: "https://sandbox.bankalfalah.com/SSO/SSO/SSO",
    cardPost: "https://sandbox.bankalfalah.com/HS/HS/HS",
    ipnBase: "https://sandbox.bankalfalah.com/HS/api/IPN/OrderStatus",
  },
  production: {
    handshake: "https://payments.bankalfalah.com/HS/api/HSAPI/HSAPI",
    doTran: "https://payments.bankalfalah.com/HS/api/Tran/DoTran",
    proTran: "https://payments.bankalfalah.com/HS/api/ProcessTran/ProTran",
    sso: "https://payments.bankalfalah.com/SSO/SSO/SSO",
    cardPost: "https://payments.bankalfalah.com/HS/HS/HS",
    ipnBase: "https://payments.bankalfalah.com/HS/api/IPN/OrderStatus",
  },
} as const;

/** Payment-session record persisted between REST steps. */
interface ApgSession {
  orderId: string;
  orderNumber: string;
  amountPkr: number;
  transactionTypeId: string;
  authToken: string;
  hashKey?: string;
  isOtp: boolean;
}

export class AlfaPaymentGatewayService {
  private static get urls() {
    return ENV.APG_ENV === "production" ? APG_URLS.production : APG_URLS.sandbox;
  }

  private static get configured(): boolean {
    return Boolean(
      ENV.APG_MERCHANT_ID &&
      ENV.APG_STORE_ID &&
      ENV.APG_MERCHANT_USERNAME &&
      ENV.APG_MERCHANT_PASSWORD &&
      ENV.APG_MERCHANT_HASH &&
      ENV.APG_KEY1 &&
      ENV.APG_KEY2,
    );
  }

  private static requireConfig(): void {
    if (!this.configured) {
      throw new Error(
        "APG credentials not configured. Set APG_MERCHANT_ID, APG_STORE_ID, APG_MERCHANT_USERNAME, APG_MERCHANT_PASSWORD, APG_MERCHANT_HASH, APG_KEY1, APG_KEY2.",
      );
    }
  }

  /** AES-128-CBC(Key1, iv=Key2) over the ordered map string. */
  private static encryptRequestHash(mapString: string): string {
    const key = Buffer.from(ENV.APG_KEY1, "utf-8");
    const iv = Buffer.from(ENV.APG_KEY2, "utf-8");
    if (key.length !== 16) {
      throw new Error(`APG_KEY1 must be exactly 16 characters (got ${key.length}).`);
    }
    if (iv.length !== 16) {
      throw new Error(`APG_KEY2 must be exactly 16 characters (got ${iv.length}).`);
    }
    const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(mapString, "utf-8"), cipher.final()]);
    return encrypted.toString("base64");
  }

  /** APG returns JSON-encoded JSON — unwrap both layers. */
  private static parseApgResponse(raw: string): any {
    try {
      const first = JSON.parse(raw);
      if (typeof first === "string") return JSON.parse(first);
      return first;
    } catch {
      try {
        return JSON.parse(JSON.parse(JSON.stringify(raw)));
      } catch {
        throw new Error(`APG returned an unparsable response: ${String(raw).slice(0, 300)}`);
      }
    }
  }

  private static async postForm(url: string, fields: Record<string, string>): Promise<any> {
    const response = await axios.post(url, new URLSearchParams(fields).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20_000,
    });
    return this.parseApgResponse(response.data);
  }

  private static async paymentRateGate(order: any): Promise<void> {
    if (order.payment_status === PaymentStatus.PAID) {
      throw new Error(`Order ${order.order_number} is already paid`);
    }
  }

  // ── STEP 1: Handshake ─────────────────────────────────────────────────────

  /**
   * Creates an onsite payment session: Handshake + Initiate Transaction.
   * Returns only the opaque AuthToken to the client (never credentials).
   * The AuthToken doubles as the client's session handle for later steps.
   */
  static async createOnsiteSession(input: {
    orderId: string;
    method: PaymentMethod;
    accountNumber?: string; // wallet number or Alfalah account number
    customerEmail?: string;
    customerPhone?: string;
  }): Promise<{
    authToken: string;
    orderNumber: string;
    amountPkr: number;
    transactionTypeId: string;
  }> {
    this.requireConfig();

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", input.orderId)
      .single();
    if (error || !order) throw new Error(`Order not found: ${input.orderId}`);
    await this.paymentRateGate(order);

    const transactionTypeId =
      input.method === PaymentMethod.ALFA_WALLET
        ? APG_TRANSACTION_TYPE.ALFA_WALLET
        : APG_TRANSACTION_TYPE.ALFALAH_ACCOUNT;
    if (!input.accountNumber) {
      throw new Error("accountNumber is required for Alfa Wallet / Alfalah Account payments");
    }

    const returnUrl = this.returnUrl(order.order_number);

    // 1a. Handshake
    const hsMap =
      `HS_ChannelId=${API_CHANNEL}` +
      `&HS_MerchantId=${ENV.APG_MERCHANT_ID}` +
      `&HS_StoreId=${ENV.APG_STORE_ID}` +
      `&HS_ReturnURL=${encodeURIComponent(returnUrl)}` +
      `&HS_MerchantHash=${ENV.APG_MERCHANT_HASH}` +
      `&HS_MerchantUsername=${ENV.APG_MERCHANT_USERNAME}` +
      `&HS_MerchantPassword=${encodeURIComponent(ENV.APG_MERCHANT_PASSWORD)}` +
      `&HS_TransactionReferenceNumber=${encodeURIComponent(order.order_number)}`;

    const hs = await this.postForm(this.urls.handshake, {
      HS_ChannelId: API_CHANNEL,
      HS_MerchantId: ENV.APG_MERCHANT_ID,
      HS_StoreId: ENV.APG_STORE_ID,
      HS_ReturnURL: returnUrl,
      HS_MerchantHash: ENV.APG_MERCHANT_HASH,
      HS_MerchantUsername: ENV.APG_MERCHANT_USERNAME,
      HS_MerchantPassword: ENV.APG_MERCHANT_PASSWORD,
      HS_TransactionReferenceNumber: order.order_number,
      HS_RequestHash: this.encryptRequestHash(hsMap),
    });

    if (String(hs?.success) !== "true" || !hs.AuthToken) {
      throw new Error(`APG handshake failed: ${hs?.ErrorMessage || "no AuthToken"}`);
    }

    // 1b. Initiate Transaction
    const tranMap =
      `ChannelId=${API_CHANNEL}` +
      `&MerchantId=${ENV.APG_MERCHANT_ID}` +
      `&StoreId=${ENV.APG_STORE_ID}` +
      `&MerchantHash=${ENV.APG_MERCHANT_HASH}` +
      `&MerchantUsername=${ENV.APG_MERCHANT_USERNAME}` +
      `&MerchantPassword=${encodeURIComponent(ENV.APG_MERCHANT_PASSWORD)}` +
      `&ReturnURL=${encodeURIComponent(returnUrl)}` +
      `&Currency=PKR` +
      `&AuthToken=${encodeURIComponent(hs.AuthToken)}` +
      `&TransactionTypeId=${transactionTypeId}` +
      `&TransactionReferenceNumber=${encodeURIComponent(order.order_number)}` +
      `&TransactionAmount=${order.total_amount_pkr}` +
      `&AccountNumber=${encodeURIComponent(input.accountNumber)}` +
      `&Country=164` +
      `&EmailAddress=${encodeURIComponent(input.customerEmail || "noreply@waw.com.pk")}` +
      `&MobileNumber=${encodeURIComponent(input.customerPhone || order.buyer_phone || "")}`;

    const tran = await this.postForm(this.urls.doTran, {
      ChannelId: API_CHANNEL,
      MerchantId: ENV.APG_MERCHANT_ID,
      StoreId: ENV.APG_STORE_ID,
      MerchantHash: ENV.APG_MERCHANT_HASH,
      MerchantUsername: ENV.APG_MERCHANT_USERNAME,
      MerchantPassword: ENV.APG_MERCHANT_PASSWORD,
      ReturnURL: returnUrl,
      Currency: "PKR",
      AuthToken: hs.AuthToken,
      TransactionTypeId: transactionTypeId,
      TransactionReferenceNumber: order.order_number,
      TransactionAmount: String(order.total_amount_pkr),
      AccountNumber: input.accountNumber,
      Country: "164",
      EmailAddress: input.customerEmail || "noreply@waw.com.pk",
      MobileNumber: input.customerPhone || order.buyer_phone || "",
      RequestHash: this.encryptRequestHash(tranMap),
    });

    if (String(tran?.success) !== "true" || !tran.AuthToken) {
      throw new Error(`APG initiate transaction failed: ${tran?.ErrorMessage || "no AuthToken"}`);
    }

    const session: ApgSession = {
      orderId: order.id,
      orderNumber: order.order_number,
      amountPkr: order.total_amount_pkr || 0,
      transactionTypeId,
      authToken: tran.AuthToken,
      hashKey: tran.HashKey,
      isOtp: String(tran.IsOTP).toLowerCase() === "true",
    };

    await supabaseAdmin.from("payments").insert({
      id: `pay_apg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      order_id: order.id,
      payment_method: input.method,
      status: PaymentStatus.PENDING,
      gateway_reference: session.authToken,
      amount_pkr: session.amountPkr,
      gateway_response: { success: tran.success, isOtp: session.isOtp, stage: "initiated" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    logger.info("APG onsite session initiated", {
      orderNumber: session.orderNumber,
      type: transactionTypeId,
      isOtp: session.isOtp,
    });

    return {
      authToken: session.authToken,
      orderNumber: session.orderNumber,
      amountPkr: session.amountPkr,
      transactionTypeId,
    };
  }

  // ── STEP 3: Process Transaction (submit OTP onsite) ───────────────────────

  /**
   * Submits the OTP the customer typed on OUR checkout page and completes
   * the payment. Never trusts the process response alone — settlement is
   * confirmed by the server-to-server IPN inquiry (see verifyAndSettle).
   */
  static async processOnsitePayment(input: {
    authToken: string;
    method: PaymentMethod;
    smsOtp?: string; // 8 digits — Alfa Wallet
    smsOtac?: string; // 4 digits — Alfalah Account
    emailOtac?: string; // 4 digits — Alfalah Account
  }): Promise<{
    success: boolean;
    status: string;
    message: string;
    transactionId?: string;
  }> {
    this.requireConfig();

    const { data: payment, error: pErr } = await supabaseAdmin
      .from("payments")
      .select("id, order_id, amount_pkr, status, payment_method")
      .eq("gateway_reference", input.authToken)
      .maybeSingle();
    if (pErr || !payment) {
      throw new Error("Payment session not found. Restart checkout.");
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", payment.order_id)
      .single();
    if (!order) throw new Error("Order not found");
    await this.paymentRateGate(order);

    // Reload the session's HashKey — the process call requires the HashKey
    // returned by the initiate step.
    const transactionTypeId =
      payment.payment_method === PaymentMethod.ALFA_WALLET
        ? APG_TRANSACTION_TYPE.ALFA_WALLET
        : APG_TRANSACTION_TYPE.ALFALAH_ACCOUNT;

    const { data: sessionRow } = await supabaseAdmin
      .from("payments")
      .select("gateway_response")
      .eq("gateway_reference", input.authToken)
      .maybeSingle();
    const hashKey = (sessionRow?.gateway_response as any)?.hashKey || "";

    const returnUrl = this.returnUrl(order.order_number);

    const proMap =
      `ChannelId=${API_CHANNEL}` +
      `&MerchantId=${ENV.APG_MERCHANT_ID}` +
      `&StoreId=${ENV.APG_STORE_ID}` +
      `&MerchantHash=${ENV.APG_MERCHANT_HASH}` +
      `&MerchantUsername=${ENV.APG_MERCHANT_USERNAME}` +
      `&MerchantPassword=${encodeURIComponent(ENV.APG_MERCHANT_PASSWORD)}` +
      `&ReturnURL=${encodeURIComponent(returnUrl)}` +
      `&Currency=PKR` +
      `&AuthToken=${encodeURIComponent(input.authToken)}` +
      `&TransactionTypeId=${transactionTypeId}` +
      `&TransactionReferenceNumber=${encodeURIComponent(order.order_number)}` +
      `&SMSOTAC=${input.smsOtac || ""}` +
      `&EmailOTAC=${input.emailOtac || ""}` +
      `&SMSOTP=${input.smsOtp || ""}` +
      `&HashKey=${encodeURIComponent(hashKey)}`;

    const pro = await this.postForm(this.urls.proTran, {
      ChannelId: API_CHANNEL,
      MerchantId: ENV.APG_MERCHANT_ID,
      StoreId: ENV.APG_STORE_ID,
      MerchantHash: ENV.APG_MERCHANT_HASH,
      MerchantUsername: ENV.APG_MERCHANT_USERNAME,
      MerchantPassword: ENV.APG_MERCHANT_PASSWORD,
      ReturnURL: returnUrl,
      Currency: "PKR",
      AuthToken: input.authToken,
      TransactionTypeId: transactionTypeId,
      TransactionReferenceNumber: order.order_number,
      SMSOTAC: input.smsOtac || "",
      EmailOTAC: input.emailOtac || "",
      SMSOTP: input.smsOtp || "",
      HashKey: hashKey,
      RequestHash: this.encryptRequestHash(proMap),
    });

    const paid = String(pro?.transaction_status || pro?.TransactionStatus || "").toUpperCase() === "PAID" ||
      String(pro?.response_code || pro?.ResponseCode) === "00";

    if (!paid) {
      await supabaseAdmin
        .from("payments")
        .update({
          status: PaymentStatus.FAILED,
          gateway_response: pro,
          updated_at: new Date().toISOString(),
        })
        .eq("gateway_reference", input.authToken);
      return {
        success: false,
        status: "FAILED",
        message: pro?.description || pro?.Description || "Payment was not completed",
      };
    }

    // Authoritative settlement via IPN inquiry — the process response alone
    // is never trusted to mark an order paid.
    const settled = await this.verifyAndSettle({
      orderNumber: order.order_number,
      transactionId: pro?.unique_tran_id || pro?.TransactionId || "",
    });

    return {
      success: settled.settled,
      status: settled.settled ? PaymentStatus.PAID : "PENDING",
      message: settled.message,
      transactionId: settled.transactionId,
    };
  }

  // ── STEP 4: IPN verification + atomic settlement ──────────────────────────

  /**
   * Server-to-server IPN inquiry — the ONLY trusted settlement source.
   * GET {ipnBase}/{merchantId}/{storeId}/{orderNumber}
   * Reuses the same atomic settle_order_payment RPC + event-state machine
   * as the shared settle_order_payment RPC, so idempotency/concurrency guarantees are identical.
   */
  static async verifyAndSettle(input: { orderNumber: string; transactionId?: string }): Promise<{
    settled: boolean;
    message: string;
    transactionId?: string;
  }> {
    this.requireConfig();

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("order_number", input.orderNumber)
      .single();
    if (!order) throw new Error(`Order ${input.orderNumber} not found`);

    const ipnUrl = `${this.urls.ipnBase}/${ENV.APG_MERCHANT_ID}/${ENV.APG_STORE_ID}/${encodeURIComponent(input.orderNumber)}`;
    const response = await axios.get(ipnUrl, { timeout: 20_000 });
    const ipn = this.parseApgResponse(typeof response.data === "string" ? response.data : JSON.stringify(response.data));

    const txId = input.transactionId || ipn?.TransactionId || `apg_${input.orderNumber}`;
    const status = String(ipn?.TransactionStatus || "").toUpperCase();

    // Idempotency: already paid -> no state change
    if (order.payment_status === PaymentStatus.PAID) {
      return { settled: true, message: "Order already paid", transactionId: txId };
    }

    if (status !== "PAID" && status !== "PAID/") {
      return {
        settled: false,
        message: `IPN status: ${ipn?.TransactionStatus || "unknown"}`,
        transactionId: txId,
      };
    }

    // Security gates: amount must match the authoritative order total
    const verification = verifyProviderPaymentAgainstOrder({
      providerAmount: ipn?.TransactionAmount,
      providerCurrency: "PKR",
      orderAmountPkr: order.total_amount_pkr,
      orderPaymentStatus: order.payment_status,
    });
    if (!verification.ok && verification.reason !== "already_paid") {
      logger.error("APG IPN verification failed — order NOT marked paid", {
        orderNumber: input.orderNumber,
        reason: verification.reason,
      });
      return { settled: false, message: verification.reason || "verification failed", transactionId: txId };
    }

    // ATOMIC SETTLEMENT — row-locked RPC (order PAID + event applied in one transaction)
    const { data: settlement, error: settleError } = await supabaseAdmin.rpc(
      "settle_order_payment",
      {
        p_order_id: order.id,
        p_transaction_id: txId,
        p_amount_pkr: Number(ipn?.TransactionAmount || order.total_amount_pkr),
      },
    );
    if (settleError) throw new Error(`Atomic settlement failed: ${settleError.message}`);

    const action = (settlement as any)?.action;
    if (action === "amount-mismatch") {
      return { settled: false, message: "Settlement amount mismatch", transactionId: txId };
    }
    if (action === "already-applied" || action === "already-paid") {
      return { settled: true, message: "Already settled", transactionId: txId };
    }
    if (action !== "settled") {
      return { settled: false, message: `Settlement did not complete (${action})`, transactionId: txId };
    }

    // Post-commit side effects via durable outbox (courier + notifications)
    if (order.items && order.items.length > 0) {
      await InventoryLockService.commitStockDecrement(
        order.id,
        order.items.map((it: any) => ({
          productId: it.offer_variant_id || it.product_id || it.id,
          variantId: it.offer_variant_id || it.variant_id,
          quantity: it.quantity,
        })),
      );
    }
    await OutboxService.publish("BOOK_COURIER", { orderId: order.id, orderNumber: order.order_number });
    await OutboxService.publish("NOTIFY_ORDER_CONFIRMED", {
      orderId: order.id,
      orderNumber: order.order_number,
      buyerPhone: order.buyer_phone,
      buyerId: order.buyer_id,
      totalPkr: order.total_amount_pkr || 0,
    });

    logger.info("APG payment settled", { orderNumber: input.orderNumber, transactionId: txId });
    return { settled: true, message: "Payment settled", transactionId: txId };
  }

  /**
   * Handles the APG IPN listener callback (POST with `url` parameter).
   * APG POSTs: {url: "https://payments.bankalfalah.com/HS/api/IPN/OrderStatus/<mid>/<sid>/<order>}
   * The merchant responds by GETting that url. Because the IPN URL embeds
   * OUR merchant+store ids, only genuine APG calls carry valid shape; the
   * fetched status is itself re-validated against our order before settle.
   */
  static async handleIpnListener(body: { url?: string }): Promise<{ received: boolean }> {
    if (!body?.url) {
      // Not an error worth alerting on — many scanners probe this endpoint.
      return { received: false };
    }
    // Only accept IPN fetch URLs from Bank Alfalah hosts
    const parsed = new URL(body.url);
    if (!/\.bankalfalah\.com$/.test(parsed.hostname) && parsed.hostname !== "payments.bankalfalah.com") {
      logger.warn("APG IPN listener called with foreign url — ignored", { host: parsed.hostname });
      return { received: false };
    }
    // The last path segment is our order number
    const orderNumber = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    if (!orderNumber) return { received: false };

    const result = await this.verifyAndSettle({ orderNumber });
    return { received: result.settled };
  }

  /** Buyer-facing return URL after the hosted card page. */
  private static returnUrl(orderNumber: string): string {
    const web = process.env.NEXT_PUBLIC_WEB_URL || "https://www.waw.com.pk";
    return `${web}/payment/result?order=${encodeURIComponent(orderNumber)}`;
  }

  /**
   * Subscription card checkout — like createCardCheckout but for direct
   * (non-order) charges: seller subscription plans. Uses the same hosted
   * page; the paymentReference doubles as the APG TransactionReferenceNumber
   * and is embedded in the return URL for settlement verification.
   */
  static async createSubscriptionCardCheckout(input: {
    amountPkr: number;
    paymentReference: string; // e.g. sub_<store>_<uuid>
    description: string;
    buyerEmail: string;
    buyerPhone: string;
    returnUrl: string;
  }): Promise<{ postUrl: string; fields: Record<string, string>; redirectUrl: string }> {
    this.requireConfig();

    const hsMap =
      `HS_ChannelId=${REDIRECTION_CHANNEL}` +
      `&HS_IsRedirectionRequest=1` +
      `&HS_MerchantId=${ENV.APG_MERCHANT_ID}` +
      `&HS_StoreId=${ENV.APG_STORE_ID}` +
      `&HS_ReturnURL=${encodeURIComponent(input.returnUrl)}` +
      `&HS_MerchantHash=${ENV.APG_MERCHANT_HASH}` +
      `&HS_MerchantUsername=${ENV.APG_MERCHANT_USERNAME}` +
      `&HS_MerchantPassword=${encodeURIComponent(ENV.APG_MERCHANT_PASSWORD)}` +
      `&HS_TransactionReferenceNumber=${encodeURIComponent(input.paymentReference)}`;

    // The hosted page is step 1 of the 2-step redirect flow: it returns an
    // AuthToken, which the buyer's browser posts back — so the seller portal
    // auto-submits these fields and the bank handles the rest.
    return {
      postUrl: this.urls.cardPost,
      fields: {
        HS_RequestHash: this.encryptRequestHash(hsMap),
        HS_IsRedirectionRequest: "1",
        HS_ChannelId: REDIRECTION_CHANNEL,
        HS_ReturnURL: input.returnUrl,
        HS_MerchantId: ENV.APG_MERCHANT_ID,
        HS_StoreId: ENV.APG_STORE_ID,
        HS_MerchantHash: ENV.APG_MERCHANT_HASH,
        HS_MerchantUsername: ENV.APG_MERCHANT_USERNAME,
        HS_MerchantPassword: ENV.APG_MERCHANT_PASSWORD,
        HS_TransactionReferenceNumber: input.paymentReference,
      },
      redirectUrl: input.returnUrl,
    };
  }

  /**
   * Card checkout (hosted page — required by PCI). Two-step redirect:
   * returns the exact form fields the WEB app must POST to the bank.
   */
  static async createCardCheckout(input: {
    orderId: string;
    customerEmail?: string;
    customerPhone?: string;
  }): Promise<{
    postUrl: string;
    fields: Record<string, string>;
    orderNumber: string;
    amountPkr: number;
  }> {
    this.requireConfig();

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", input.orderId)
      .single();
    if (error || !order) throw new Error(`Order not found: ${input.orderId}`);
    await this.paymentRateGate(order);

    const returnUrl = this.returnUrl(order.order_number);

    const hsMap =
      `HS_ChannelId=${REDIRECTION_CHANNEL}` +
      `&HS_IsRedirectionRequest=1` +
      `&HS_MerchantId=${ENV.APG_MERCHANT_ID}` +
      `&HS_StoreId=${ENV.APG_STORE_ID}` +
      `&HS_ReturnURL=${encodeURIComponent(returnUrl)}` +
      `&HS_MerchantHash=${ENV.APG_MERCHANT_HASH}` +
      `&HS_MerchantUsername=${ENV.APG_MERCHANT_USERNAME}` +
      `&HS_MerchantPassword=${encodeURIComponent(ENV.APG_MERCHANT_PASSWORD)}` +
      `&HS_TransactionReferenceNumber=${encodeURIComponent(order.order_number)}`;

    return {
      postUrl: this.urls.cardPost,
      fields: {
        HS_RequestHash: this.encryptRequestHash(hsMap),
        HS_IsRedirectionRequest: "1",
        HS_ChannelId: REDIRECTION_CHANNEL,
        HS_ReturnURL: returnUrl,
        HS_MerchantId: ENV.APG_MERCHANT_ID,
        HS_StoreId: ENV.APG_STORE_ID,
        HS_MerchantHash: ENV.APG_MERCHANT_HASH,
        HS_MerchantUsername: ENV.APG_MERCHANT_USERNAME,
        HS_MerchantPassword: ENV.APG_MERCHANT_PASSWORD,
        HS_TransactionReferenceNumber: order.order_number,
      },
      orderNumber: order.order_number,
      amountPkr: order.total_amount_pkr || 0,
    };
  }
}
