import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
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
import { performanceTracker } from "./middleware/performance.middleware.js";

// Middlewares
import { requireAuth } from "./middleware/auth.middleware.js";
import { requireActiveStore } from "./middleware/require-active-store.middleware.js";
import { requireRole } from "./middleware/require-role.middleware.js";
import {
  otpRateLimiter,
  apiRateLimiter,
  cartRateLimiter,
  orderRateLimiter,
  reviewRateLimiter,
  wishlistRateLimiter,
  supportRateLimiter,
} from "./middleware/rate-limit.middleware.js";
import { validateBody } from "./middleware/validate.middleware.js";
import { apiVersioning } from "./middleware/api-versioning.middleware.js";

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
import { CartController } from "./modules/cart/cart.controller.js";
import { ConfigController } from "./modules/config/config.controller.js";
import { AIController } from "./modules/ai/ai.controller.js";

export const app = express();

app.set("trust proxy", 1);

app.use(requestTracer);
app.use(performanceTracker);
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
  "http://localhost:4000",
];

const dynamicOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOriginSet = new Set([...TRUSTED_ORIGINS, ...dynamicOrigins]);

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
app.use(apiRateLimiter);
app.use(apiVersioning);

// ── Swagger API Documentation ──────────────────────────────────────────────
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

// â”€â”€ Health & Diagnostics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Waw (ÙˆØ§Ùˆ) API Engine",
    country: "Pakistan (PKR)",
    supabaseBackend: "Connected (PostgreSQL / Auth / Storage)",
    freeDeliveryThreshold: ENV.FREE_DELIVERY_THRESHOLD_PKR,
    codHandlingFee: ENV.DEFAULT_COD_FEE_PKR,
    timestamp: new Date().toISOString(),
  });
});

// Deep Readiness & Dependency Probe
app.get("/readyz", async (req, res) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};
  let isHealthy = true;

  // 1. Supabase PostgreSQL Ping
  const startDb = Date.now();
  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .select("id", { head: true, count: "exact" });
    checks.supabasePostgres = {
      status: error ? "unhealthy" : "healthy",
      latencyMs: Date.now() - startDb,
    };
    if (error) isHealthy = false;
  } catch {
    checks.supabasePostgres = {
      status: "healthy",
      latencyMs: Date.now() - startDb,
    };
  }

  // 2. Redis Ping
  const startRedis = Date.now();
  try {
    await redis.set("healthcheck", "1", { ex: 10 });
    checks.redis = { status: "healthy", latencyMs: Date.now() - startRedis };
  } catch {
    checks.redis = {
      status: "degraded_fallback",
      latencyMs: Date.now() - startRedis,
    };
  }

  // 3. Typesense Ping
  const startTypesense = Date.now();
  try {
    const health = await typesenseClient.health.retrieve();
    checks.typesense = {
      status: health.ok ? "healthy" : "unhealthy",
      latencyMs: Date.now() - startTypesense,
    };
  } catch {
    checks.typesense = {
      status: "degraded_fallback",
      latencyMs: Date.now() - startTypesense,
    };
  }

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ready" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

// â”€â”€ Authentication Routes (Supabase Phone/OTP & OAuth) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/auth/login", AuthController.login);

app.post(
  "/api/auth/whatsapp-otp/send",
  otpRateLimiter,
  validateBody(RequestOtpSchema),
  AuthController.requestOtp,
);

app.post(
  "/api/auth/whatsapp-otp/verify",
  validateBody(VerifyOtpSchema),
  AuthController.verifyOtp,
);

app.post("/api/auth/oauth/sync", requireAuth, AuthController.syncOAuth);

// ── Storefront Config (Dynamic UI Metadata) ───────────────
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

// ── Category Taxonomy Routes (Hierarchical Database Tree) ───────────────
app.get("/api/categories", CategoryController.listTree);
app.get("/api/categories/:slug", CategoryController.getBySlug);

// ── Product Routes ──────────────────────────────────────────────────────────
app.get("/api/products", ProductController.list);
app.get("/api/products/:slug", ProductController.getBySlug);

// ── Store Routes ───────────────────────────────────────────────────────────
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

// â”€â”€ Checkout Quote Engine (Server-Authoritative Pricing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/checkout/quote", async (req, res) => {
  try {
    const { items, shippingCity, paymentMethod, couponCode } = req.body;
    if (!items || items.length === 0) {
      res.status(400).json({ error: "Cart must contain at least 1 item" });
      return;
    }
    const { QuoteService } = await import("./modules/orders/quote.service.js");
    const quote = await QuoteService.generateQuote({
      items,
      shippingCity: shippingCity || "Lahore",
      paymentMethod: paymentMethod || PaymentMethod.COD,
      couponCode,
    });
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// â”€â”€ Order Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/orders", requireAuth, orderRateLimiter, validateBody(CreateOrderSchema), OrderController.createOrder);

app.get("/api/orders", requireAuth, OrderController.listUserOrders);

app.get("/api/orders/:id", requireAuth, OrderController.getOrder);

app.post("/api/orders/:id/return", requireAuth, OrderController.createReturn);

app.get("/api/orders/:id/return", requireAuth, OrderController.getReturn);


app.patch("/api/orders/:id/status", requireAuth, requireRole(UserRole.ADMIN, UserRole.SELLER), validateBody(UpdateOrderStatusSchema), OrderController.updateStatus);

app.post("/api/orders/:id/cancel", requireAuth, OrderController.cancelOrder);

// ── User Addresses ─────────────────────────────────────────────────────────
app.get("/api/user/addresses", requireAuth, UserController.listAddresses);

app.post("/api/user/addresses", requireAuth, validateBody(UserAddressSchema), UserController.createAddress);

app.delete("/api/user/addresses/:id", requireAuth, UserController.deleteAddress);

// ── Wishlist ───────────────────────────────────────────────────────────────
app.get("/api/user/wishlist", requireAuth, UserController.listWishlist);

app.post("/api/user/wishlist", requireAuth, wishlistRateLimiter, validateBody(WishlistSchema), UserController.addToWishlist);

app.delete("/api/user/wishlist/:productId", requireAuth, UserController.removeFromWishlist);

// ── Coupon Validation (Phase 2: Promo Engine) ───────────────────────────────
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

// ── Seller Routes ──────────────────────────────────────────────────────────
app.post("/api/seller/apply", requireAuth, SellerController.apply);

app.post("/api/seller/kyc", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), SellerController.updateKyc);

app.get("/api/seller/kyc/status", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), SellerController.getKycStatus);

app.get("/api/seller/store", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), SellerController.getStore);

app.get("/api/seller/orders", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.listOrders);

app.get("/api/seller/products", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.listProducts);

app.get("/api/seller/analytics", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.getAnalytics);

app.get("/api/seller/payouts", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.listPayouts);

app.post("/api/seller/coupons", requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), requireActiveStore, SellerController.createCoupon);

// ── Destination Serviceability Routes ─────────────────────────────────────────
app.get("/api/serviceability/cities", LogisticsController.listCities);

app.get("/api/serviceability/check", LogisticsController.checkDestination);

// ── Customer Support & Dispute Routes ───────────────────────────────────────
app.post("/api/support/tickets", requireAuth, supportRateLimiter, SupportController.createTicket);

app.get("/api/support/tickets", requireAuth, SupportController.listTickets);

app.get("/api/support/tickets/:id", requireAuth, SupportController.getTicket);

app.post("/api/support/tickets/:id/messages", requireAuth, validateBody(SupportMessageSchema), SupportController.addMessage);

// ── Logistics Webhook (PostEx Live Milestone Updates) ─────────────────────────
app.post("/api/logistics/postex/webhook", LogisticsController.handlePostExWebhook);

// â”€â”€ Payment Routes (PostEx XPay Unified Fintech Engine) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post(
  "/api/payments/xpay/initiate",
  requireAuth,
  PaymentController.initiateXPay,
);
app.post("/api/payments/xpay/webhook", PaymentController.xpayWebhook);

// ── Raast P2M QR Routes ────────────────────────────────────────────────
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
      logger.warn("RAAST_WEBHOOK_SECRET not set — skipping signature verification (dev mode)");
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

// ── Server-Backed Guest Cart Routes ──────────────────────────────────────────
app.get("/api/cart", cartRateLimiter, CartController.getCart);
app.post("/api/cart/items", cartRateLimiter, CartController.addItem);
app.patch("/api/cart/items", cartRateLimiter, CartController.updateItem);
app.delete("/api/cart/items", cartRateLimiter, CartController.removeItem);
app.delete("/api/cart", cartRateLimiter, CartController.clearCart);
app.post("/api/cart/merge", requireAuth, cartRateLimiter, CartController.mergeGuestCart);

// â”€â”€ Search Routes (Typesense Engine) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/search", SearchController.search);

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

// â”€â”€ Admin Control Center (Strict Admin Guard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// ── Admin KYC Approval Routes ───────────────────────────────────────────────
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

// ── Admin Product Listing Approvals ─────────────────────────────────────────
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

// ── Admin Review Moderation ─────────────────────────────────────────────────
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

// ── Admin Dispute Resolution ────────────────────────────────────────────────
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

// ── Admin Return & Reverse Logistics Management ─────────────────────────────
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

// ── Admin Marketplace Settings ─────────────────────────────────────────
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

      // Upsert each setting — store as proper jsonb, not stringified
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
    } catch (err: any) {
      logger.error("Admin settings update error:", err);
      res.status(500).json({ error: err.message });
    }
  },
);

// ── Buyer Product Review Submission (Account & Purchase Verified) ───────────
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

    // Optimized verified-purchase check: use a targeted subquery instead of fetching all orders
    const { data: orderItem } = await supabaseAdmin
      .from("order_items")
      .select("id, order_id!inner(buyer_id, global_status)")
      .eq("offer_variant_id", productId)
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

    // Recalculate and update product rating average
    const { data: allReviews } = await supabaseAdmin
      .from("reviews")
      .select("rating")
      .eq("product_id", productId);

    if (allReviews && allReviews.length > 0) {
      const avg =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await supabaseAdmin
        .from("catalog_products")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
    }

    res.status(201).json(review);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Buyer Order Dispute Submission ──────────────────────────────────────────
app.post("/api/orders/:id/dispute", requireAuth, validateBody(CreateDisputeSchema), OrderController.createDispute);

// ── 404 Handler for undefined routes ────────────────────────────────────────
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global 404 Handler ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// ── Global Error Handler ────────────────────────────────────────────────────
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

