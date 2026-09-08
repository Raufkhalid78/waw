import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./config/env.js";
import { UserRole, PaymentMethod } from "./types/index.js";
import { supabaseAdmin } from "./config/supabase.js";
import { redis } from "./config/redis.js";
import { typesenseClient } from "./config/typesense.js";
import { requestTracer, logger } from "./config/logger.js";
import { ConfigService } from "./modules/admin/config.service.js";
import { performanceTracker } from "./middleware/performance.middleware.js";

// Middlewares
import { requireAuth, attachOptionalUser } from "./middleware/auth.middleware.js";
import { requireActiveStore } from "./middleware/require-active-store.middleware.js";
import { requireRole } from "./middleware/require-role.middleware.js";
import { csrfProtection } from "./middleware/csrf.middleware.js";
import {
  otpRateLimiter,
  apiRateLimiter,
  cartRateLimiter,
  orderRateLimiter,
  reviewRateLimiter,
  wishlistRateLimiter,
  supportRateLimiter,
  loginRateLimiter,
  otpVerifyRateLimiter,
} from "./middleware/rate-limit.middleware.js";
import { validateBody } from "./middleware/validate.middleware.js";
import { apiVersioning } from "./middleware/api-versioning.middleware.js";
import { sanitizeInput } from "./middleware/sanitize.middleware.js";

// Schemas
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  CreateProductSchema,
  CreateOrderSchema,
  CreateReviewSchema,
  CreateDisputeSchema,
  AdminSettingsSchema,
  UpdateOrderStatusSchema,
  UserAddressSchema,
  WishlistSchema,
  SellerKycSchema,
  SupportMessageSchema,
} from "./modules/common/schemas.js";

// Controllers
import { AuthController } from "./modules/auth/auth.controller.js";
import { SessionController } from "./modules/auth/session.controller.js";
import { CategoryController } from "./modules/categories/category.controller.js";
import { ProductController } from "./modules/products/product.controller.js";
import { OrderController } from "./modules/orders/order.controller.js";
import { UserController } from "./modules/users/user.controller.js";
import { SellerController } from "./modules/sellers/seller.controller.js";
import { SupportController } from "./modules/support/support.controller.js";
import { LogisticsController } from "./modules/logistics/logistics.controller.js";
import { StoreController } from "./modules/stores/store.controller.js";
import { OrderService } from "./modules/orders/order.service.js";
import { PaymentController } from "./modules/payments/payment.controller.js";
import { SearchController } from "./modules/search/search.service.js";
import { AdminController } from "./modules/admin/admin.controller.js";
import mfaRoutes from "./modules/admin/mfa.routes.js";
import { CartController } from "./modules/cart/cart.controller.js";
import reviewsRouter from "./modules/reviews/reviews.routes.js";
import questionsRouter from "./modules/questions/questions.routes.js";
import { ConfigController } from "./modules/config/config.controller.js";
import { PushController } from "./modules/notifications/push.controller.js";
import { AIController } from "./modules/ai/ai.controller.js";
import { LoyaltyController } from "./modules/loyalty/loyalty.controller.js";
import { ReferralController } from "./modules/referrals/referral.controller.js";
import { SubscriptionController } from "./modules/subscriptions/subscription.controller.js";
import { SubscriptionService } from "./modules/subscriptions/subscription.service.js";
import citiesRouter from "./modules/cities/cities.routes.js";
import preferencesRouter from "./modules/user/preferences.routes.js";
import { getMarketplaceConfig } from "./modules/admin/marketplace-config.controller.js";
import { getActiveFlashSale } from "./modules/sales/flash-sales.controller.js";
import { UploadController } from "./modules/uploads/upload.controller.js";
import { uploadSingle, uploadMultiple } from "./middleware/upload.middleware.js";
import { sentryRequestContext, sentryErrorHandler } from "./config/sentry.js";

export const app = express();

// ── Helper Functions ──────────────────────────────────────────────────────
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

app.set("trust proxy", 1);

app.use(requestTracer);
app.use(performanceTracker);
app.use(sentryRequestContext);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
      styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:"],
      connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://api.postex.com.pk", "https://typesense.waw.com.pk"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
const TRUSTED_ORIGINS = [
  "https://www.waw.com.pk",
  "https://waw.com.pk",
  "https://admin.waw.com.pk",
  "https://seller.waw.com.pk",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:4000",
];

// Load additional CORS origins from marketplace config
const dynamicOriginsFromConfig: string[] = [];
ConfigService.get("cors_allowed_origins").then((val) => {
  if (val) {
    val.split(",").map((o: string) => o.trim()).filter(Boolean).forEach((o: string) => dynamicOriginsFromConfig.push(o));
  }
}).catch(() => {});

const dynamicOriginsEnv = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOriginSet = new Set([...TRUSTED_ORIGINS, ...dynamicOriginsEnv, ...dynamicOriginsFromConfig]);

const WEBHOOK_PATHS = ["/api/logistics/postex/webhook", "/api/payments/xpay/webhook", "/api/payments/raast/webhook"];

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true; // Allow server-to-server (webhooks, health checks)
  if (allowedOriginSet.has(origin)) return true;
  if (/^https:\/\/(www|admin|seller|api)\.waw\.com\.pk$/.test(origin)) return true;
  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Correlation-Id",
    "X-CSRF-Token",
  ],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
};

app.use(cors(corsOptions));
// Handle preflight OPTIONS requests for all routes (required for credentialed cross-origin requests)
app.options("*", cors(corsOptions));
app.use(
  express.json({
    limit: "500kb",
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(morgan(ENV.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());
app.use(apiRateLimiter);
app.use(apiVersioning);
app.use(sanitizeInput);
app.use(csrfProtection);

// -- Swagger API Documentation (dev/staging only — never in production) ----
if (ENV.NODE_ENV !== "production") {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const openapiDoc = YAML.load(path.join(__dirname, "../../openapi.yaml"));
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Waw API Documentation",
    }));
  } catch (err) {
    logger.warn("Failed to load OpenAPI docs", { error: (err as Error).message });
  }
}

// ── Health & Diagnostics ──────────────────────────────────────────────────
// Minimal liveness probe — no sensitive information exposed
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Deep Readiness & Dependency Probe — detailed info requires admin auth
app.get("/readyz", async (req, res) => {
  // Check for admin auth — detailed diagnostics are admin-only
  const isAdmin = await (async () => {
    try {
      const accessToken = req.cookies?.waw_session;
      if (!accessToken) return false;
      const { SessionService } = await import("./modules/auth/session.service.js");
      const session = await SessionService.validateSession(accessToken);
      if (!session) return false;
      const { supabaseAdmin: sa } = await import("./config/supabase.js");
      const { data: profile } = await sa.from("profiles").select("role").eq("id", session.userId).single();
      return profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN";
    } catch {
      return false;
    }
  })();

  if (!isAdmin) {
    // Minimal response for load balancers / k8s probes
    res.status(200).json({ status: "ok" });
    return;
  }

  // Full diagnostics for admin users only
  const checks: Record<string, { status: string; latencyMs?: number; details?: any }> = {};
  let isHealthy = true;
  const startTime = Date.now();

  // 1. Supabase PostgreSQL Ping
  const startDb = Date.now();
  try {
    const { error, count } = await supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" });
    checks.supabasePostgres = {
      status: error ? "unhealthy" : "healthy",
      latencyMs: Date.now() - startDb,
    };
    if (error) isHealthy = false;
  } catch {
    checks.supabasePostgres = { status: "unhealthy", latencyMs: Date.now() - startDb };
    isHealthy = false;
  }

  // 2. Redis Ping
  const startRedis = Date.now();
  try {
    await redis.set("healthcheck", "1", { ex: 10 });
    checks.redis = {
      status: (Date.now() - startRedis) > 1000 ? "degraded" : "healthy",
      latencyMs: Date.now() - startRedis,
    };
  } catch {
    checks.redis = { status: "degraded_fallback", latencyMs: Date.now() - startRedis };
  }

  // 3. Typesense Ping
  const startTs = Date.now();
  try {
    const health = await typesenseClient.health.retrieve();
    checks.typesense = {
      status: health.ok ? "healthy" : "unhealthy",
      latencyMs: Date.now() - startTs,
    };
  } catch {
    checks.typesense = { status: "degraded_fallback", latencyMs: Date.now() - startTs };
  }

  const totalLatency = Date.now() - startTime;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ready" : "degraded",
    checks,
    totalLatencyMs: totalLatency,
    timestamp: new Date().toISOString(),
  });
});

// Liveness probe (simple check for container orchestration)
app.get("/livez", (req, res) => {
  res.status(200).json({ status: "alive" });
});

// ── Authentication Routes (Supabase Phone/OTP & OAuth) ────────────────────
app.post("/api/auth/login", loginRateLimiter, AuthController.login);

app.post(
  "/api/auth/whatsapp-otp/send",
  otpRateLimiter,
  validateBody(RequestOtpSchema),
  AuthController.requestOtp,
);

app.post(
  "/api/auth/whatsapp-otp/verify",
  otpVerifyRateLimiter,
  validateBody(VerifyOtpSchema),
  AuthController.verifyOtp,
);

app.post("/api/auth/oauth/sync", requireAuth, AuthController.syncOAuth);

// -- CSRF Token Issuance (public, GET) ------------------------------
app.get("/api/auth/csrf", SessionController.issueCsrf);

// -- Session Management (HttpOnly Cookie-based) ---------------------
app.post("/api/auth/session/create", SessionController.createSession);
app.post("/api/auth/session/refresh", SessionController.refreshSession);
app.post("/api/auth/session/revoke", SessionController.revokeSession);
app.get("/api/auth/session/me", SessionController.getCurrentUser);
app.post("/api/auth/session/revoke-all", requireAuth, SessionController.revokeAllSessions);

// -- Storefront Config (Dynamic UI Metadata) ---------------
// CMS Content Route
app.get("/api/content", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("cms_content")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    res.json({ content: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

  app.get("/api/config/storefront", ConfigController.getStorefrontConfig);
  app.get("/api/config/hero-banners", ConfigController.getHeroBanners);

  // -- Push notifications (FCM, authenticated device tokens) ----------------
  app.post("/api/push/tokens", requireAuth, PushController.registerToken);
  app.delete("/api/push/tokens", requireAuth, PushController.removeToken);

// -- Category Taxonomy Routes (Hierarchical Database Tree) ---------------
app.get("/api/categories", CategoryController.listTree);
app.get("/api/categories/:slug", CategoryController.getBySlug);

// -- Product Routes ----------------------------------------------------------
app.get("/api/products", ProductController.list);
app.get("/api/products/best-sellers", ProductController.bestSellers);
app.get("/api/products/:slug", ProductController.getBySlug);

// -- Store Routes -----------------------------------------------------------
app.get("/api/stores", StoreController.listStores);

app.get("/api/stores/:slug", StoreController.getStoreBySlug);

// Seller/Admin Only product listing
app.post(
  "/api/products",
  requireAuth,
  requireRole(UserRole.SELLER, UserRole.ADMIN),
  requireActiveStore,
  validateBody(CreateProductSchema),
  ProductController.create,
);

// ── Checkout Quote Engine (Server-Authoritative Pricing) ──────────────────
app.post("/api/checkout/quote", async (req, res) => {
  try {
    const { items, shippingCity, paymentMethod, couponCode, useLoyaltyPoints } = req.body;
    if (!items || items.length === 0) {
      res.status(400).json({ error: "Cart must contain at least 1 item" });
      return;
    }
    // Optional auth: resolve userId from cookie if present (for loyalty calculation)
    let userId: string | undefined;
    if (useLoyaltyPoints) {
      try {
        const cookieToken = req.cookies?.waw_session;
        if (cookieToken) {
          const { SessionService } = await import("./modules/auth/session.service.js");
          const session = await SessionService.validateSession(cookieToken);
          if (session) userId = session.userId;
        }
      } catch {
        // Guest checkout — no userId, skip loyalty
      }
    }
    const { QuoteService } = await import("./modules/orders/quote.service.js");
    const defaultCity = await ConfigService.get("default_city") || "Lahore";
    const quote = await QuoteService.generateQuote({
      items,
      shippingCity: shippingCity || defaultCity,
      paymentMethod: paymentMethod || PaymentMethod.COD,
      couponCode,
      useLoyaltyPoints: useLoyaltyPoints && userId ? true : false,
      userId,
    });
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Order Routes ──────────────────────────────────────────────────────────
app.post("/api/orders", requireAuth, orderRateLimiter, validateBody(CreateOrderSchema), OrderController.createOrder);

app.post("/api/orders/guest", orderRateLimiter, OrderController.createGuestOrder);

app.get("/api/orders", requireAuth, OrderController.listUserOrders);

// Guest order lookup by order number + phone — MUST be registered before the
// :id param route so "lookup" is not captured as an id.
app.get("/api/orders/lookup", OrderController.lookupGuestOrder);

app.get("/api/orders/:id", requireAuth, OrderController.getOrder);

app.get("/api/orders/:id/invoice", requireAuth, OrderController.downloadInvoice);

app.post("/api/orders/:id/return", requireAuth, OrderController.createReturn);

app.get("/api/orders/:id/return", requireAuth, OrderController.getReturn);


app.patch("/api/orders/:id/status", requireAuth, requireRole(UserRole.ADMIN, UserRole.SELLER), validateBody(UpdateOrderStatusSchema), OrderController.updateStatus);

app.post("/api/orders/:id/cancel", requireAuth, OrderController.cancelOrder);

// -- User Addresses ---------------------------------------------------------
app.get("/api/user/addresses", requireAuth, UserController.listAddresses);

  app.get("/api/user/me/export", requireAuth, UserController.exportData);
  app.delete("/api/user/me/delete", requireAuth, UserController.deleteAccount);

app.post("/api/user/addresses", requireAuth, validateBody(UserAddressSchema), UserController.createAddress);

app.delete("/api/user/addresses/:id", requireAuth, UserController.deleteAddress);

// -- Wishlist ---------------------------------------------------------------
app.get("/api/user/wishlist", requireAuth, UserController.listWishlist);

app.post("/api/user/wishlist", requireAuth, wishlistRateLimiter, validateBody(WishlistSchema), UserController.addToWishlist);

app.delete("/api/user/wishlist/:productId", requireAuth, UserController.removeFromWishlist);

// -- Coupon Validation (Phase 2: Promo Engine) -------------------------------
app.post("/api/checkout/apply-coupon", requireAuth, async (req, res) => {
  try {
    const { couponCode, items } = req.body;
    if (!couponCode || !items) {
      res.status(400).json({ error: "couponCode and items are required" });
      return;
    }
    const result = await OrderService.applyCoupon(couponCode, items);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -- Seller Routes ----------------------------------------------------------
app.post("/api/seller/apply", requireAuth, SellerController.apply);

app.post("/api/seller/kyc", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), SellerController.updateKyc);

app.get("/api/seller/kyc/status", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), SellerController.getKycStatus);

app.get("/api/seller/store", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), SellerController.getStore);

app.get("/api/seller/orders", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.listOrders);

app.get("/api/seller/products", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.listProducts);

app.get("/api/seller/analytics", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.getAnalytics);

app.get("/api/seller/payouts", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.listPayouts);

app.post("/api/seller/coupons", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.createCoupon);

// -- Destination Serviceability Routes -----------------------------------------
app.get("/api/serviceability/cities", LogisticsController.listCities);

app.get("/api/serviceability/check", LogisticsController.checkDestination);

// -- Customer Support & Dispute Routes ---------------------------------------
app.post("/api/support/tickets", requireAuth, supportRateLimiter, SupportController.createTicket);

app.get("/api/support/tickets", requireAuth, SupportController.listTickets);

app.get("/api/support/tickets/:id", requireAuth, SupportController.getTicket);

app.post("/api/support/tickets/:id/messages", requireAuth, validateBody(SupportMessageSchema), SupportController.addMessage);

// -- Logistics Webhook (PostEx Live Milestone Updates) -------------------------
app.post("/api/logistics/postex/webhook", LogisticsController.handlePostExWebhook);

// ── Payment Routes (PostEx XPay Unified Fintech Engine) ────────────────────
// Auth is optional: logged-in users pay their own orders; guests must supply
// the exact phone the order was placed with (validated in the controller).
app.post(
  "/api/payments/xpay/initiate",
  attachOptionalUser,
  PaymentController.initiateXPay,
);
app.post("/api/payments/xpay/webhook", PaymentController.xpayWebhook);

// -- Raast P2M QR Routes ------------------------------------------------
app.post(
  "/api/payments/raast/qr",
  requireAuth,
  async (req: any, res) => {
    try {
      const { RaastService } = await import(
        "./modules/payments/raast.service.js"
      );
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
      }

      // Verify order ownership
      const { supabaseAdmin } = await import("./config/supabase.js");
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error || !order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.buyer_id !== (req as any).user.id && (req as any).user.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Idempotency: return existing PENDING Raast payment reference if one exists
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id, gateway_reference, amount_pkr")
        .eq("order_id", order.id)
        .eq("payment_method", "RAAST")
        .eq("status", "PENDING")
        .maybeSingle();

      if (existingPayment?.gateway_reference) {
        return res.json({ referenceId: existingPayment.gateway_reference, amountPkr: existingPayment.amount_pkr });
      }

      const result = await RaastService.generateDynamicQr({
        orderId: order.id,
        orderNumber: order.order_number,
        amountPkr: order.total_amount_pkr || 0,
      });

      // Record payment intent
      await supabaseAdmin.from("payments").insert({
        id: `pay_raast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: order.id,
        payment_method: "RAAST",
        status: "PENDING",
        gateway_reference: result.referenceId,
        amount_pkr: order.total_amount_pkr || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      res.json(result);
    } catch (err: any) {
      logger.error("Raast QR generation error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

app.post("/api/payments/raast/webhook", async (req: any, res) => {
  try {
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const raastSecret = ENV.RAAST_WEBHOOK_SECRET;

    if (raastSecret) {
      const signature = req.headers["x-raast-signature"] as string | undefined;
      if (!signature) {
        logger.warn("Raast webhook: missing x-raast-signature header");
        return res.status(401).json({ error: "Missing webhook signature" });
      }
      const crypto = await import("crypto");
      const computed = crypto
        .createHmac("sha256", raastSecret)
        .update(rawBody)
        .digest("hex");
      const sigBuffer = Buffer.from(signature, "hex");
      const compBuffer = Buffer.from(computed, "hex");
      if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
        return res.status(401).json({ error: "Invalid Raast webhook signature" });
      }
    } else if (ENV.NODE_ENV === "production") {
      return res.status(500).json({ error: "RAAST webhook secret not configured" });
    } else {
      logger.warn("RAAST_WEBHOOK_SECRET not set � skipping signature verification (dev mode)");
    }

    const { RaastService } = await import(
      "./modules/payments/raast.service.js"
    );
    const { referenceId, amountPkr, transactionId, status } = req.body;

    if (!referenceId || !amountPkr) {
      return res.status(400).json({ error: "referenceId and amountPkr are required" });
    }

    const result = await RaastService.verifyRaastPayment(
      referenceId,
      amountPkr,
      transactionId,
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Process successful Raast payment similar to XPay webhook
    const { supabaseAdmin } = await import("./config/supabase.js");
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*, order:orders(*)")
      .eq("gateway_reference", referenceId)
      .single();

    if (payment?.order) {
      const order = payment.order;

      // Idempotency: skip if already processed
      if (payment.status === "PAID" && order.payment_status === "PAID") {
        return res.json({ received: true, idempotent: true });
      }

      // Update order status
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "PAID",
          global_status: "CONFIRMED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // Update payment record
      await supabaseAdmin
        .from("payments")
        .update({
          status: "PAID",
          gateway_reference: result.transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      // Book courier (non-COD)
      try {
        const { CourierService } = await import(
          "./modules/logistics/courier.service.js"
        );
        const { data: orderItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        await CourierService.bookCourierShipment({
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: order.buyer_name,
          customerPhone: order.buyer_phone,
          deliveryAddress: order.shipping_address,
          destinationCity: order.shipping_city,
          codAmountPkr: 0,
          isCod: false,
          itemsCount: orderItems?.length || 1,
        });
      } catch (courierErr) {
        logger.warn("PostEx booking notice:", courierErr);
      }

      // WhatsApp notification
      try {
        const { WhatsAppService } = await import(
          "./modules/notifications/whatsapp.service.js"
        );
        await WhatsAppService.sendOrderConfirmed(
          order.buyer_phone,
          order.order_number,
          order.total_amount_pkr || 0,
          false,
        );
      } catch (notifErr) {
        logger.warn("WhatsApp notice:", notifErr);
      }
    }

    res.json({ received: true, ...result });
  } catch (err: any) {
    logger.error("Raast webhook error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -- Server-Backed Guest Cart Routes ------------------------------------------
app.get("/api/cart", cartRateLimiter, CartController.getCart);
app.put("/api/cart", cartRateLimiter, CartController.replaceCart);
app.post("/api/cart/items", cartRateLimiter, CartController.addItem);
app.patch("/api/cart/items", cartRateLimiter, CartController.updateItem);
app.delete("/api/cart/items", cartRateLimiter, CartController.removeItem);
app.delete("/api/cart", cartRateLimiter, CartController.clearCart);
app.post("/api/cart/merge", requireAuth, cartRateLimiter, CartController.mergeGuestCart);

// -- Loyalty & Rewards Routes ------------------------------------------------
app.get("/api/loyalty/balance", requireAuth, LoyaltyController.getBalance);
app.get("/api/loyalty/history", requireAuth, LoyaltyController.getHistory);
app.post("/api/loyalty/redeem", requireAuth, LoyaltyController.calculateRedemption);

// -- Referral Program Routes -------------------------------------------------
app.get("/api/referrals/stats", requireAuth, ReferralController.getStats);
app.post("/api/referrals/generate", requireAuth, ReferralController.generateCode);
app.post("/api/referrals/validate", ReferralController.validateCode);
app.post("/api/referrals/apply", requireAuth, ReferralController.applyCode);

// -- Subscription Routes -----------------------------------------------------
app.get("/api/subscriptions/plans", SubscriptionController.getPlans);
app.get("/api/seller/subscription", requireAuth, SubscriptionController.getCurrentSubscription);
app.post("/api/seller/subscribe", requireAuth, SubscriptionController.subscribe);
app.delete("/api/seller/subscription", requireAuth, SubscriptionController.cancel);

// -- Admin Subscription Management ---------------------------------------------
// Lists every store with its plan/expiry for the admin Subscriptions page.
app.get("/api/admin/subscriptions", requireAuth, requireRole(UserRole.ADMIN), async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select(`
        id, name, slug, city, status,
        subscription_plan, subscription_active, subscription_expires_at,
        owner:owner_user_id(full_name, phone),
        subscription:seller_subscriptions(id, status, started_at, expires_at, payment_reference, plan:subscription_plans(display_name, price_pkr))
      `)
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ stores: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load subscriptions" });
  }
});

// Admin: manually activate/extend a store's subscription (e.g. bank transfer)
app.post("/api/admin/subscriptions/:storeId/activate", requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { storeId } = req.params;
    const months = Math.min(Math.max(parseInt(String(req.body?.months) || "1", 10) || 1, 1), 24);
    const result = await SubscriptionService.adminActivateSubscription(storeId, months);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: revoke a store's paid subscription (downgrade to Free)
app.post("/api/admin/subscriptions/:storeId/revoke", requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { storeId } = req.params;
    await SubscriptionService.cancel(storeId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Search Routes (Typesense Engine) ──────────────────────────────────────
app.get("/api/search", SearchController.search);

// ── Marketplace Stats (Public, cached 5min) ──────────────────────────────
app.get("/api/marketplace-stats", async (_req, res) => {
  try {
    const cacheKey = "marketplace-stats";
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }

    const [sellers, orders, storeCities, reviews] = await Promise.all([
      supabaseAdmin.from("stores").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabaseAdmin.from("orders").select("id", { count: "exact", head: true }).eq("global_status", "DELIVERED"),
      supabaseAdmin.from("stores").select("city").eq("status", "ACTIVE"),
      supabaseAdmin.from("reviews").select("rating").limit(1000),
    ]);

    const uniqueCities = new Set((storeCities.data || []).map((c: any) => c.city).filter(Boolean));
    const reviewData = reviews.data || [];
    const avgRating = reviewData.length
      ? (reviewData.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewData.length).toFixed(1)
      : "0";

    // Real numbers only — no fabricated fallbacks. Zeros are honest while
    // the marketplace grows; fake "500 sellers" is not.
    const stats = {
      verifiedSellers: sellers.count || 0,
      ordersDelivered: orders.count || 0,
      citiesCovered: uniqueCities.size || 0,
      avgRating: parseFloat(avgRating),
    };

    await redis.setex(cacheKey, 300, JSON.stringify(stats));
    res.json(stats);
  } catch (err: any) {
    logger.error("Marketplace stats error", "API", err);
    // Signal failure explicitly; the frontend hides the section on null.
    res.status(503).json({ error: "Stats temporarily unavailable" });
  }
});

app.post(
  "/api/ai/generate-description",
  requireAuth,
  apiRateLimiter,
  AIController.generateDescription,
);
app.post(
  "/api/ai/chat",
  requireAuth,
  apiRateLimiter,
  AIController.chat,
);
app.get(
  "/api/ai/recommendations/:productId",
  apiRateLimiter,
  AIController.getRecommendations,
);
app.get(
  "/api/ai/usage",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AIController.getUsage,
);

// ── Admin Control Center (Strict Admin Guard) ─────────────────────────────
app.get(
  "/api/admin/stats",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.getStats,
);
app.get(
  "/api/admin/products",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listAllProducts,
);
app.get(
  "/api/admin/orders",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listAllOrders,
);
app.get(
  "/api/admin/users",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listAllUsers,
);
app.post(
  "/api/admin/users/:id/ban",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.banUser,
);
app.post(
  "/api/admin/users/:id/unban",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.unbanUser,
);
app.get(
  "/api/admin/sellers",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listSellers,
);
app.patch(
  "/api/admin/sellers/:id",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.updateSeller,
);
app.get(
  "/api/admin/payouts",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listPayouts,
);
app.post(
  "/api/admin/payouts/:id/settle",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.settlePayout,
);

app.post(
  "/api/admin/reconciliation/run",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req, res) => {
    try {
      const { executeReconciliationJob } = await import("./jobs/reconciliation.cron.js");
      const report = await executeReconciliationJob();
      res.json({ success: true, ...report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// -- Admin KYC Approval Routes -----------------------------------------------
app.get(
  "/api/admin/kyc/pending",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listPendingKyc,
);

app.patch(
  "/api/admin/kyc/:storeId/approve",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.approveKyc,
);

app.patch(
  "/api/admin/kyc/:storeId/reject",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.rejectKyc,
);

// -- Admin Product Listing Approvals -----------------------------------------
app.get(
  "/api/admin/products/pending",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listPendingProducts,
);
app.patch(
  "/api/admin/products/:id/approve",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.approveProduct,
);
app.patch(
  "/api/admin/products/:id/reject",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.rejectProduct,
);

// -- Admin Review Moderation -------------------------------------------------
app.get(
  "/api/admin/reviews/pending",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listPendingReviews,
);
app.patch(
  "/api/admin/reviews/:id/approve",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.approveReview,
);
app.patch(
  "/api/admin/reviews/:id/reject",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.rejectReview,
);

// -- Admin Dispute Resolution ------------------------------------------------
app.get(
  "/api/admin/disputes",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listDisputes,
);
app.patch(
  "/api/admin/disputes/:id/resolve",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.resolveDispute,
);

// -- Admin Return & Reverse Logistics Management -----------------------------
app.get(
  "/api/admin/returns",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.listReturns,
);
app.patch(
  "/api/admin/returns/:id/receive",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.receiveReturn,
);
app.patch(
  "/api/admin/returns/:id/refund",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.approveReturnRefund,
);
app.patch(
  "/api/admin/returns/:id/reject",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.rejectReturn,
);

// -- Admin Flash Sales Management -----------------------------------------
app.get("/api/admin/flash-sales", requireAuth, requireRole(UserRole.ADMIN), AdminController.listFlashSales);
app.post("/api/admin/flash-sales", requireAuth, requireRole(UserRole.ADMIN), AdminController.createFlashSale);
app.patch("/api/admin/flash-sales/:id", requireAuth, requireRole(UserRole.ADMIN), AdminController.updateFlashSale);
app.delete("/api/admin/flash-sales/:id", requireAuth, requireRole(UserRole.ADMIN), AdminController.deleteFlashSale);
app.post("/api/admin/flash-sales/:id/items", requireAuth, requireRole(UserRole.ADMIN), AdminController.addFlashSaleItem);
app.delete("/api/admin/flash-sales/items/:itemId", requireAuth, requireRole(UserRole.ADMIN), AdminController.removeFlashSaleItem);

// -- Admin Banner/Campaign Management -------------------------------------
app.get("/api/admin/banners", requireAuth, requireRole(UserRole.ADMIN), AdminController.listBanners);
app.post("/api/admin/banners", requireAuth, requireRole(UserRole.ADMIN), AdminController.createBanner);
app.patch("/api/admin/banners/:id", requireAuth, requireRole(UserRole.ADMIN), AdminController.updateBanner);
app.delete("/api/admin/banners/:id", requireAuth, requireRole(UserRole.ADMIN), AdminController.deleteBanner);

// -- Admin Category Management --------------------------------------------
app.get("/api/admin/categories", requireAuth, requireRole(UserRole.ADMIN), AdminController.listCategories);
app.post("/api/admin/categories", requireAuth, requireRole(UserRole.ADMIN), AdminController.createCategory);
app.patch("/api/admin/categories/:id", requireAuth, requireRole(UserRole.ADMIN), AdminController.updateCategory);
app.delete("/api/admin/categories/:id", requireAuth, requireRole(UserRole.ADMIN), AdminController.deleteCategory);

// -- Cart Abandonment Recovery (Cron) --------------------------------------
app.post("/api/admin/cron/abandoned-carts", requireAuth, requireRole(UserRole.ADMIN), AdminController.processAbandonedCarts);

// -- File Upload Routes (Supabase Storage) ---------------------------------
app.post(
  "/api/uploads/:bucket",
  requireAuth,
  uploadSingle,
  UploadController.upload,
);
app.post(
  "/api/uploads/:bucket/multiple",
  requireAuth,
  uploadMultiple,
  UploadController.uploadMultiple,
);
app.delete(
  "/api/uploads/:bucket/:path",
  requireAuth,
  UploadController.delete,
);

// -- Admin Marketplace Settings -----------------------------------------
app.get(
  "/api/admin/settings",
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (_req, res) => {
    try {
      const { supabaseAdmin } = await import("./config/supabase.js");
      const { data, error } = await supabaseAdmin
        .from("marketplace_settings")
        .select("key, value, description, updated_at");

      if (error) throw error;

      // Convert array of {key, value} to a flat object, fixing double-encoded values
      const settings: Record<string, any> = {};
      for (const row of data || []) {
        let val = row.value;
        // Fix double-encoded values: '"10"' -> 10, '"waw"' -> "waw"
        if (typeof val === "string") {
          try {
            const parsed = JSON.parse(val);
            // If parsed is still a string that looks like JSON, parse again
            if (typeof parsed === "string") {
              try { val = JSON.parse(parsed); } catch { val = parsed; }
            } else {
              val = parsed;
            }
          } catch {
            // Keep as-is if not valid JSON
          }
        }
        settings[row.key] = val;
      }

      res.json({ settings, metadata: data });
    } catch (err: any) {
      logger.error("Admin settings fetch error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

app.patch(
  "/api/admin/settings",
  requireAuth,
  requireRole(UserRole.ADMIN),
  validateBody(AdminSettingsSchema),
  async (req: any, res) => {
    try {
      const { supabaseAdmin } = await import("./config/supabase.js");
      const updates = req.body;

      if (!updates || typeof updates !== "object") {
        return res.status(400).json({ error: "Request body must be an object" });
      }

      const userId = req.user?.id;

      // Upsert each setting � store as proper jsonb, not stringified
      for (const [key, value] of Object.entries(updates)) {
        await supabaseAdmin
          .from("marketplace_settings")
          .upsert(
            {
              key,
              value: typeof value === "string" ? value : value,
              updated_by: userId,
            },
            { onConflict: "key" },
          );
      }

      res.json({ success: true, message: "Settings updated" });
      ConfigService.invalidateCache();
    } catch (err: any) {
      logger.error("Admin settings update error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// -- Admin MFA (TOTP) Routes ---------------------------------------------
app.use("/api/admin/mfa", mfaRoutes);

// -- Product Q&A Routes -------------------------------------------------
app.use("/api/questions", questionsRouter);

// -- Cities (public) ----------------------------------------------------
app.use("/api/cities", citiesRouter);

// -- Active Flash Sale (public, for storefront) -------------------------
app.get("/api/flash-sales/active", getActiveFlashSale);

// -- User Preferences (authenticated) -----------------------------------
app.use("/api/user/preferences", preferencesRouter);

// -- Marketplace Config (public, for frontend) --------------------------
app.get("/api/marketplace-config", getMarketplaceConfig);

// -- Buyer Product Review Submission (Account & Purchase Verified) -----------
app.post("/api/products/:id/reviews", requireAuth, reviewRateLimiter, validateBody(CreateReviewSchema), async (req, res) => {
  try {
    const user = (req as any).user;
    const { rating, comment } = req.body;
    const productId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5 stars" });
      return;
    }

    const { supabaseAdmin } = await import("./config/supabase.js");

    // Verified-purchase check: the reviewed entity is a catalog product; a
    // qualifying order item's variant belongs to a seller offer of that
    // product. order_items -> offer_variants!inner -> seller_offers!inner.
    const { data: orderItem } = await supabaseAdmin
      .from("order_items")
      .select("id, offer_variants!inner(seller_offers!inner(id, catalog_product_id))")
      .eq("offer_variants.seller_offers.catalog_product_id", productId)
      .eq("order_id.buyer_id", user.id)
      .in("order_id.global_status", ["DELIVERED", "COMPLETED"])
      .limit(1)
      .maybeSingle();

    const isVerifiedPurchase = !!orderItem;

    const { data: review, error } = await supabaseAdmin
      .from("reviews")
      .insert({
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: productId,
        user_id: user.id,
        rating: Math.round(rating),
        comment: comment || "",
        is_verified_purchase: isVerifiedPurchase,
        status: "APPROVED", // Auto-approved unless flagged
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Recalculate and persist rating aggregation on the catalog product
    try {
      const { data: agg } = await supabaseAdmin
        .from("reviews")
        .select("rating")
        .eq("product_id", productId)
        .eq("status", "APPROVED");

      if (agg) {
        const count = agg.length;
        const avg = count > 0
          ? Math.round((agg.reduce((sum, r) => sum + r.rating, 0) / count) * 100) / 100
          : 0;
        await supabaseAdmin
          .from("catalog_products")
          .update({
            rating_average: avg,
            rating_count: count,
          })
          .eq("id", productId);
      }
    } catch (aggErr: any) {
      // Aggregation failure must not fail the review submission
      logger.warn("Rating aggregation failed after review", { error: aggErr.message });
    }

    res.status(201).json(review);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -- Buyer Order Dispute Submission ------------------------------------------
app.post("/api/orders/:id/dispute", requireAuth, validateBody(CreateDisputeSchema), OrderController.createDispute);

// -- 404 Handler for undefined routes ----------------------------------------
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `Route not found` });
});

// -- Global 404 Handler ------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Not found` });
});

// -- Global Error Handler ----------------------------------------------------
app.use(sentryErrorHandler);
app.use(async (err: any, req: any, res: any, _next: any) => {
  logger.error("Unhandled Express error", { context: "ErrorHandler", message: err.message, path: req.path });
  if (ENV.NODE_ENV === "production") {
    try {
      const { captureException } = await import("./config/sentry.js");
      captureException(err instanceof Error ? err : new Error(err.message || "Unknown error"), {
        path: req.path,
        method: req.method,
      });
    } catch {}
  }
  res.status(500).json({ error: "An internal error occurred" });
});


