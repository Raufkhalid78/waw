import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ENV } from "./config/env.js";
import { UserRole, PaymentMethod } from "./types/index.js";
import { supabaseAdmin } from "./config/supabase.js";
import { redis } from "./config/redis.js";
import { typesenseClient } from "./config/typesense.js";
import { requestTracer } from "./config/logger.js";

// Middlewares
import { requireAuth } from "./middleware/auth.middleware.js";
import { requireActiveStore } from "./middleware/require-active-store.middleware.js";
import { requireRole } from "./middleware/require-role.middleware.js";
import {
  otpRateLimiter,
  apiRateLimiter,
} from "./middleware/rate-limit.middleware.js";
import { validateBody } from "./middleware/validate.middleware.js";

// Schemas
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  CreateProductSchema,
  CreateOrderSchema,
} from "./modules/common/schemas.js";

// Controllers
import { AuthController } from "./modules/auth/auth.controller.js";
import { CategoryController } from "./modules/categories/category.controller.js";
import { ProductController } from "./modules/products/product.controller.js";
import { OrderService } from "./modules/orders/order.service.js";
import { CourierService } from "./modules/logistics/courier.service.js";
import { PaymentController } from "./modules/payments/payment.controller.js";
import { SearchController } from "./modules/search/search.service.js";
import { AdminController } from "./modules/admin/admin.controller.js";

export const app = express();

app.use(requestTracer);
app.use(helmet());
const TRUSTED_ORIGINS = [
  "https://www.waw.com.pk",
  "https://waw.com.pk",
  "https://admin.waw.com.pk",
  "https://seller.waw.com.pk",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4000",
];

const dynamicOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOriginSet = new Set([...TRUSTED_ORIGINS, ...dynamicOrigins]);

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true; // Allow non-browser, server-to-server, curl, Postman requests
  if (allowedOriginSet.has(origin)) return true;
  // Allow official WAW subdomains only
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
  ],
  exposedHeaders: ["Content-Range", "X-Total-Count"],
};

app.use(cors(corsOptions));
// Handle preflight OPTIONS requests for all routes (required for credentialed cross-origin requests)
app.options("*", cors(corsOptions));
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(morgan("dev"));
app.use(apiRateLimiter);

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
    await redis.set("healthcheck", "1", "EX", 10);
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

app.post("/api/auth/oauth/sync", AuthController.syncOAuth);

// ── Storefront Config (Dynamic UI Metadata) ───────────────
import { ConfigController } from "./modules/config/config.controller.js";
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
app.get("/api/stores/:slug", async (req, res) => {
  try {
    const { supabaseAdmin } = await import("./config/supabase.js");
    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .select("id, name, slug, description, logo_url, seller_type, status, city, rating_average, rating_count, created_at")
      .eq("slug", req.params.slug)
      .eq("status", "ACTIVE")
      .single();

    if (error || !store) {
      return res.status(404).json({ error: "Store not found or not active" });
    }
    res.json(store);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

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
app.post("/api/orders", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await OrderService.createOrder(req.body, user);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const orders = await OrderService.getUserOrders(user.id);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/orders/:id", requireAuth, async (req, res) => {
  try {
    const order = await OrderService.getOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    // Authorization check
    const user = (req as any).user;
    if (user.role !== "ADMIN" && order.buyer_id !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/orders/:id/return", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await OrderService.createReturnRequest(
      req.params.id,
      user.id,
      req.body,
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/orders/:id/return", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const returnData = await OrderService.getOrderReturn(
      req.params.id,
      user.role === UserRole.ADMIN ? undefined : user.id,
    );
    if (!returnData) {
      res.status(404).json({ error: "No return request found for this order" });
      return;
    }
    res.json(returnData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.patch("/api/orders/:id/status", requireAuth, requireRole(UserRole.ADMIN, UserRole.SELLER), async (req, res) => {
  try {
    const { status, courier, trackingNumber } = req.body;
    const { supabaseAdmin } = await import("./config/supabase.js");
    const { AuditService } = await import("./modules/audit/audit.service.js");
    const user = (req as any).user;

    const { data: previousOrder } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (!previousOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Tenant check: If seller, verify store ownership
    if (user.role === "SELLER") {
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!store) {
        return res.status(403).json({ error: "Unauthorized: No active seller store found" });
      }

      const { data: storeOrder } = await supabaseAdmin
        .from("store_orders")
        .select("id")
        .eq("order_id", req.params.id)
        .eq("store_id", store.id)
        .maybeSingle();

      if (!storeOrder) {
        return res.status(403).json({ error: "Forbidden: You can only update orders belonging to your store" });
      }

      await supabaseAdmin
        .from("store_orders")
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq("id", storeOrder.id);
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({
        global_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (trackingNumber) {
      await supabaseAdmin.from("shipments").insert({
        order_id: req.params.id,
        tracking_number: trackingNumber,
        courier_name: courier || "PostEx",
        status: "BOOKED"
      });
    }

    await AuditService.logAction({
      actorId: user.id || "SYSTEM",
      actorRole: user.role || "ADMIN_OR_SELLER",
      action: "ORDER_STATUS_CHANGED",
      targetResourceType: "order",
      targetResourceId: req.params.id,
      previousState: previousOrder,
      newState: data,
      reason: `Status changed to ${status}`,
    });

    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/orders/:id/cancel", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const order = await OrderService.cancelOrder(
      req.params.id,
      req.body.reason,
      user,
    );
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

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

  // 🚀🚀 Seller Portal Routes 🚀🚀
  // Helper: Pakistani CNIC validation & normalization (XXXXX-XXXXXXX-X)
  const formatAndValidateCnic = (rawCnic?: string): string => {
    if (!rawCnic) throw new Error("Pakistani CNIC is required");
    const cleaned = rawCnic.replace(/\D/g, "");
    if (cleaned.length !== 13) {
      throw new Error("Invalid Pakistani CNIC: Must be exactly 13 digits (format: XXXXX-XXXXXXX-X)");
    }
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
  };

  // Helper: Pakistani IBAN & Bank Account validation
  const validateIbanOrAccount = (rawIban?: string): string => {
    if (!rawIban) throw new Error("Bank Account Number or IBAN is required");
    const cleaned = rawIban.replace(/[\s-]/g, "").toUpperCase();
    if (cleaned.startsWith("PK")) {
      if (cleaned.length !== 24) {
        throw new Error("Invalid Pakistani IBAN: Must be 24 characters starting with PK (e.g. PK36HABB00000012345678)");
      }
      return cleaned;
    }
    if (cleaned.length < 8 || cleaned.length > 24) {
      throw new Error("Invalid Bank Account Number: Must be between 8 and 24 characters");
    }
    return cleaned;
  };

  // Helper: Masking sensitive KYC data
  const maskCnic = (cnic?: string) => {
    if (!cnic || cnic.length < 5) return cnic;
    const clean = cnic.replace(/\D/g, "");
    if (clean.length === 13) {
      return `${clean.slice(0, 5)}-*******-${clean.slice(12)}`;
    }
    return `${cnic.slice(0, 5)}-*******-${cnic.slice(-1)}`;
  };

  const maskAccount = (acc?: string) => {
    if (!acc || acc.length < 8) return acc;
    return `${acc.slice(0, 4)}****${acc.slice(-4)}`;
  };

  // 🚀🚀 Seller Portal Routes 🚀🚀
  app.post(
    "/api/seller/apply",
    requireAuth,
    async (req, res) => {
      try {
        const user = (req as any).user;
        const { supabaseAdmin } = await import("./config/supabase.js");
        const { AuditService } = await import("./modules/audit/audit.service.js");

        // 1. Ensure user does not already have a store
        const { data: existingStore } = await supabaseAdmin
          .from("stores")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (existingStore) {
          return res.status(400).json({ error: "A store application already exists for your account." });
        }

        const { storeName, city, address, businessAddress, cnic, bankTitle, accountTitle, bankAccount, iban, bankName, ntnNumber } = req.body;

        if (!storeName || storeName.trim().length < 3) {
          return res.status(400).json({ error: "Store name must be at least 3 characters" });
        }

        const validCnic = formatAndValidateCnic(cnic);
        const validAccount = validateIbanOrAccount(iban || bankAccount);
        const resolvedAccountTitle = accountTitle || bankTitle || storeName;
        const resolvedAddress = address || businessAddress || "Lahore, Pakistan";

        // 2. Generate clean slug
        const baseSlug = storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

        // 3. Create Store record
        const { data: store, error: storeError } = await supabaseAdmin
          .from("stores")
          .insert({
            owner_id: user.id,
            name: storeName.trim(),
            slug,
            city: city || "Lahore",
            address: resolvedAddress,
            cnic: validCnic,
            cnic_number: validCnic,
            account_title: resolvedAccountTitle,
            bank_account_title: resolvedAccountTitle,
            account_number: validAccount,
            bank_account_number: validAccount,
            bank_name: bankName || "Standard Chartered / HBL",
            ntn_number: ntnNumber || null,
            status: "PENDING_KYC",
            is_verified: false,
          })
          .select()
          .single();

        if (storeError) throw storeError;

        // 4. Update Profile Role
        await supabaseAdmin
          .from("profiles")
          .update({ role: "SELLER" })
          .eq("id", user.id);

        await AuditService.logAction({
          actorId: user.id,
          actorRole: "SELLER",
          action: "SELLER_APPLIED",
          targetResourceType: "store",
          targetResourceId: store.id,
          reason: "New merchant onboarding application submitted",
        });

        res.status(201).json({
          success: true,
          message: "Store application submitted successfully for KYC review",
          store: {
            ...store,
            cnic: maskCnic(store.cnic),
            cnic_number: maskCnic(store.cnic_number),
            account_number: maskAccount(store.account_number),
            bank_account_number: maskAccount(store.bank_account_number),
          },
        });
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    }
  );

  // Seller KYC Document / Banking Update
  app.post(
    "/api/seller/kyc",
    requireAuth,
    requireRole(UserRole.SELLER, UserRole.ADMIN),
    async (req, res) => {
      try {
        const user = (req as any).user;
        const { supabaseAdmin } = await import("./config/supabase.js");
        const { AuditService } = await import("./modules/audit/audit.service.js");

        const { data: store } = await supabaseAdmin
          .from("stores")
          .select("*")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!store) {
          return res.status(404).json({ error: "Store not found for this seller" });
        }

        const { cnic, accountTitle, bankTitle, bankAccount, iban, bankName, branchCity, ntnNumber, address } = req.body;

        const validCnic = formatAndValidateCnic(cnic || store.cnic || store.cnic_number);
        const validAccount = validateIbanOrAccount(iban || bankAccount || store.account_number || store.bank_account_number);
        const resolvedTitle = accountTitle || bankTitle || store.account_title || store.name;
        const resolvedBankName = bankName || store.bank_name || "Bank";

        const { data: updatedStore, error: updateError } = await supabaseAdmin
          .from("stores")
          .update({
            cnic: validCnic,
            cnic_number: validCnic,
            account_title: resolvedTitle,
            bank_account_title: resolvedTitle,
            account_number: validAccount,
            bank_account_number: validAccount,
            bank_name: resolvedBankName,
            city: branchCity || store.city,
            address: address || store.address,
            ntn_number: ntnNumber || store.ntn_number,
            status: store.status === "ACTIVE" ? "ACTIVE" : "PENDING_KYC",
            updated_at: new Date().toISOString(),
          })
          .eq("id", store.id)
          .select()
          .single();

        if (updateError) throw updateError;

        await AuditService.logAction({
          actorId: user.id,
          actorRole: "SELLER",
          action: "KYC_DETAILS_UPDATED",
          targetResourceType: "store",
          targetResourceId: store.id,
          reason: "Seller submitted updated KYC credentials and banking details",
        });

        res.json({
          success: true,
          message: "KYC details updated successfully",
          store: {
            ...updatedStore,
            cnic: maskCnic(updatedStore.cnic),
            cnic_number: maskCnic(updatedStore.cnic_number),
            account_number: maskAccount(updatedStore.account_number),
            bank_account_number: maskAccount(updatedStore.bank_account_number),
          },
        });
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    }
  );

  // Seller KYC Status Check
  app.get(
    "/api/seller/kyc/status",
    requireAuth,
    requireRole(UserRole.SELLER, UserRole.ADMIN),
    async (req, res) => {
      try {
        const user = (req as any).user;
        const { supabaseAdmin } = await import("./config/supabase.js");

        const { data: store } = await supabaseAdmin
          .from("stores")
          .select("id, name, slug, status, is_verified, cnic, cnic_number, account_title, bank_account_title, account_number, bank_account_number, bank_name, city, address, created_at, updated_at")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (!store) {
          return res.status(404).json({ error: "No store associated with this account" });
        }

        res.json({
          storeId: store.id,
          storeName: store.name,
          status: store.status,
          isVerified: Boolean(store.is_verified),
          cnicMasked: maskCnic(store.cnic || store.cnic_number),
          accountTitle: store.account_title || store.bank_account_title,
          accountMasked: maskAccount(store.account_number || store.bank_account_number),
          bankName: store.bank_name,
          city: store.city,
          address: store.address,
          submittedAt: store.created_at,
          lastUpdatedAt: store.updated_at,
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  app.get(
    "/api/seller/store",
    requireAuth,
    requireRole(UserRole.SELLER, UserRole.ADMIN),
    async (req, res) => {
      try {
        const user = (req as any).user;
        const { data: store } = await import("./config/supabase.js").then(
          ({ supabaseAdmin }) =>
            supabaseAdmin
              .from("stores")
              .select("*")
              .eq("owner_id", user.id)
              .maybeSingle(),
        );

        if (!store) {
          res.json({ message: "No store found for this seller" });
          return;
        }

        res.json({
          ...store,
          cnic: maskCnic(store.cnic || store.cnic_number),
          cnic_number: maskCnic(store.cnic || store.cnic_number),
          account_number: maskAccount(store.account_number || store.bank_account_number),
          bank_account_number: maskAccount(store.account_number || store.bank_account_number),
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

app.get(
  "/api/seller/orders",
  requireAuth,
  requireRole(UserRole.SELLER, UserRole.ADMIN),
  requireActiveStore,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { supabaseAdmin } = await import("./config/supabase.js");
      // Find store owned by this seller
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json([]);
        return;
      }

      const { data: storeOrders } = await supabaseAdmin
        .from("store_orders")
        .select(
          "*, order_id, order_items(*), shipments(*), orders(buyer_name, buyer_phone, shipping_city)",
        )
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      res.json(storeOrders || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.get(
  "/api/seller/products",
  requireAuth,
  requireRole(UserRole.SELLER, UserRole.ADMIN),
  requireActiveStore,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { supabaseAdmin } = await import("./config/supabase.js");
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!store) {
        res.json([]);
        return;
      }

      const { data: products, error } = await supabaseAdmin
        .from("seller_offers")
        .select("*, catalog_product:catalog_products(*, category:categories(name, slug)), variants:offer_variants(*)")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(products || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.get(
  "/api/seller/analytics",
  requireAuth,
  requireRole(UserRole.SELLER, UserRole.ADMIN),
  requireActiveStore,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { supabaseAdmin } = await import("./config/supabase.js");
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json({
          totalRevenuePkr: 0,
          pendingPayoutsPkr: 0,
          totalOrders: 0,
          activeProducts: 0,
          storeStatus: "NOT_FOUND",
        });
        return;
      }

      // 1. Fetch store orders
      const { data: storeOrders } = await supabaseAdmin
        .from("store_orders")
        .select("subtotal_pkr, status")
        .eq("store_id", store.id);

      const validOrders = (storeOrders || []).filter(
        (o: any) => o.status !== "CANCELLED",
      );
      const totalRevenuePkr = validOrders.reduce(
        (sum: number, o: any) => sum + (o.subtotal_pkr || 0),
        0,
      );

      // 2. Fetch pending payouts
      const { data: payouts } = await supabaseAdmin
        .from("payouts")
        .select("amount_pkr")
        .eq("store_id", store.id)
        .eq("status", "SCHEDULED");

      const pendingPayoutsPkr = (payouts || []).reduce(
        (sum: number, p: any) => sum + (p.amount_pkr || 0),
        0,
      );

      // 3. Fetch active products count
      const { count: activeProducts } = await supabaseAdmin
        .from("seller_offers")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "ACTIVE");

      res.json({
        totalRevenuePkr,
        pendingPayoutsPkr,
        totalOrders: (storeOrders || []).length,
        activeProducts: activeProducts || 0,
        storeStatus: store.status,
        storeName: store.name,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

app.get(
  "/api/seller/payouts",
  requireAuth,
  requireRole(UserRole.SELLER, UserRole.ADMIN),
  requireActiveStore,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { supabaseAdmin } = await import("./config/supabase.js");
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.json([]);
        return;
      }

      const { data: payouts } = await supabaseAdmin
        .from("payouts")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      res.json(payouts || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// Coupon Management for Sellers
app.post(
  "/api/seller/coupons",
  requireAuth,
  requireRole(UserRole.SELLER, UserRole.ADMIN),
  requireActiveStore,
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { supabaseAdmin } = await import("./config/supabase.js");
      const { data: store } = await supabaseAdmin
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!store) {
        res.status(403).json({ error: "No store found" });
        return;
      }

      const {
        code,
        discountType,
        discountValue,
        minSpendPkr,
        maxDiscountPkr,
        expiresAt,
        maxUses,
      } = req.body;
      const { data: coupon, error } = await supabaseAdmin
        .from("coupons")
        .insert({
          code: code.toUpperCase(),
          store_id: store.id, // Seller-scoped by default
          discount_type: discountType || "PERCENTAGE",
          discount_value: discountValue,
          min_spend_pkr: minSpendPkr || 0,
          max_discount_pkr: maxDiscountPkr || null,
          expires_at: expiresAt || null,
          max_uses: maxUses || null,
        })
        .select()
        .single();

      if (error) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(201).json(coupon);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// ── Destination Serviceability Routes ─────────────────────────────────────────
app.get("/api/serviceability/cities", async (req, res) => {
  try {
    const { ServiceabilityService } = await import("./modules/logistics/serviceability.service.js");
    const cities = await ServiceabilityService.listServiceableCities();
    res.json(cities);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/serviceability/check", async (req, res) => {
  try {
    const { city, sellerCity, paymentMethod } = req.query;
    const { ServiceabilityService } = await import("./modules/logistics/serviceability.service.js");
    const result = await ServiceabilityService.checkDestination(
      city as string,
      sellerCity as string,
      paymentMethod as any,
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Customer Support & Dispute Routes ───────────────────────────────────────
app.post("/api/support/tickets", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { SupportService } = await import("./modules/support/support.service.js");
    const ticket = await SupportService.createTicket(user.id, req.body);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/support/tickets", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { SupportService } = await import("./modules/support/support.service.js");
    const tickets = await SupportService.getBuyerTickets(user.id);
    res.json(tickets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/support/tickets/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { SupportService } = await import("./modules/support/support.service.js");
    const details = await SupportService.getTicketDetails(req.params.id, user.id, user.role);
    res.json(details);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/support/tickets/:id/messages", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { message, attachments } = req.body;
    const { SupportService } = await import("./modules/support/support.service.js");
    const msg = await SupportService.addMessage(
      req.params.id,
      user.id,
      user.role,
      user.name || user.email || "User",
      message,
      attachments,
    );
    res.status(201).json(msg);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Logistics Webhook (PostEx Live Milestone Updates) ─────────────────────────
app.post("/api/logistics/postex/webhook", async (req, res) => {
  try {
    const result = await CourierService.handlePostExWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// â”€â”€ Payment Routes (PostEx XPay Unified Fintech Engine) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post(
  "/api/payments/xpay/initiate",
  requireAuth,
  PaymentController.initiateXPay,
);
app.post("/api/payments/xpay/webhook", PaymentController.xpayWebhook);

// â”€â”€ Search Routes (Typesense Engine) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/search", SearchController.search);

// â”€â”€ Admin Control Center (Strict Admin Guard) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get(
  "/api/admin/stats",
  requireAuth,
  requireRole(UserRole.ADMIN),
  AdminController.getStats,
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

// ── Buyer Product Review Submission (Account & Purchase Verified) ───────────
app.post("/api/products/:id/reviews", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { rating, comment } = req.body;
    const productId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5 stars" });
      return;
    }

    const { supabaseAdmin } = await import("./config/supabase.js");

    // Check if buyer has an ordered/delivered item for this product
    const { data: userOrders } = await supabaseAdmin
      .from("orders")
      .select("id, global_status, store_orders(order_items(offer_variant_id, product_title))")
      .eq("buyer_id", user.id);

    const isVerifiedPurchase = (userOrders || []).some(
      (ord: any) =>
        ord.store_orders?.some((so: any) =>
          so.order_items?.some(
            (item: any) =>
              item.offer_variant_id === productId ||
              item.product_title?.toLowerCase().includes(productId.toLowerCase()),
          ),
        ),
    );

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
app.post("/api/orders/:id/dispute", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await OrderService.createDispute(
      req.params.id,
      user.id,
      req.body,
    );
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

