import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import { UserRole, PaymentMethod } from './types/index.js';
import { supabaseAdmin } from './config/supabase.js';
import { redis } from './config/redis.js';
import { typesenseClient } from './config/typesense.js';
import { requestTracer } from './config/logger.js';

// Middlewares
import { requireAuth } from './middleware/auth.middleware.js';
import { requireRole } from './middleware/require-role.middleware.js';
import { otpRateLimiter, apiRateLimiter } from './middleware/rate-limit.middleware.js';
import { validateBody } from './middleware/validate.middleware.js';

// Schemas
import {
  RequestOtpSchema,
  VerifyOtpSchema,
  CreateProductSchema,
  CreateOrderSchema,
} from './modules/common/schemas.js';

// Controllers
import { AuthController } from './modules/auth/auth.controller.js';
import { ProductController } from './modules/products/product.controller.js';
import { OrderService } from './modules/orders/order.service.js';
import { CourierService } from './modules/logistics/courier.service.js';
import { PaymentController } from './modules/payments/payment.controller.js';
import { SearchController } from './modules/search/search.service.js';
import { AdminController } from './modules/admin/admin.controller.js';

export const app = express();

app.use(requestTracer);
app.use(helmet());
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(morgan('dev'));
app.use(apiRateLimiter);

// ── Health & Diagnostics ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Waw (واو) API Engine',
    country: 'Pakistan (PKR)',
    supabaseBackend: 'Connected (PostgreSQL / Auth / Storage)',
    freeDeliveryThreshold: ENV.FREE_DELIVERY_THRESHOLD_PKR,
    codHandlingFee: ENV.DEFAULT_COD_FEE_PKR,
    timestamp: new Date().toISOString(),
  });
});

// Deep Readiness & Dependency Probe
app.get('/readyz', async (req, res) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};
  let isHealthy = true;

  // 1. Supabase PostgreSQL Ping
  const startDb = Date.now();
  try {
    const { error } = await supabaseAdmin.from('profiles').select('id', { head: true, count: 'exact' });
    checks.supabasePostgres = { status: error ? 'unhealthy' : 'healthy', latencyMs: Date.now() - startDb };
    if (error) isHealthy = false;
  } catch {
    checks.supabasePostgres = { status: 'healthy', latencyMs: Date.now() - startDb };
  }

  // 2. Redis Ping
  const startRedis = Date.now();
  try {
    await redis.set('healthcheck', '1', 'EX', 10);
    checks.redis = { status: 'healthy', latencyMs: Date.now() - startRedis };
  } catch {
    checks.redis = { status: 'degraded_fallback', latencyMs: Date.now() - startRedis };
  }

  // 3. Typesense Ping
  const startTypesense = Date.now();
  try {
    const health = await typesenseClient.health.retrieve();
    checks.typesense = { status: health.ok ? 'healthy' : 'unhealthy', latencyMs: Date.now() - startTypesense };
  } catch {
    checks.typesense = { status: 'degraded_fallback', latencyMs: Date.now() - startTypesense };
  }

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ── Authentication Routes (Supabase Phone/OTP & OAuth) ────────────────────
app.post(
  '/api/auth/whatsapp-otp/send',
  otpRateLimiter,
  validateBody(RequestOtpSchema),
  AuthController.requestOtp
);

app.post(
  '/api/auth/whatsapp-otp/verify',
  validateBody(VerifyOtpSchema),
  AuthController.verifyOtp
);

app.post('/api/auth/oauth/sync', AuthController.syncOAuth);

// ── Product Routes ────────────────────────────────────────────────────────
app.get('/api/products', ProductController.list);
app.get('/api/products/:slug', ProductController.getBySlug);

// Seller/Admin Only product listing
app.post(
  '/api/products',
  requireAuth,
  requireRole(UserRole.SELLER, UserRole.ADMIN),
  validateBody(CreateProductSchema),
  ProductController.create
);

// ── Checkout Quote Engine (Server-Authoritative Pricing) ──────────────────
app.post('/api/checkout/quote', async (req, res) => {
  try {
    const { items, shippingCity, paymentMethod, couponCode } = req.body;
    if (!items || items.length === 0) {
      res.status(400).json({ error: 'Cart must contain at least 1 item' });
      return;
    }
    const { QuoteService } = await import('./modules/orders/quote.service.js');
    const quote = await QuoteService.generateQuote({
      items,
      shippingCity: shippingCity || 'Lahore',
      paymentMethod: paymentMethod || PaymentMethod.COD,
      couponCode,
    });
    res.json(quote);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Order Routes ──────────────────────────────────────────────────────────
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await OrderService.createOrder(req.body, user);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const order = await OrderService.getOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    // Authorization check
    const user = (req as any).user;
    if (user.role !== 'ADMIN' && order.buyer_id !== user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/cancel', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const order = await OrderService.cancelOrder(req.params.id, req.body.reason, user);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Coupon Validation (Phase 2: Promo Engine) ────────────────────────────
app.post('/api/checkout/apply-coupon', requireAuth, async (req, res) => {
  try {
    const { couponCode, items } = req.body;
    if (!couponCode || !items) {
      res.status(400).json({ error: 'couponCode and items are required' });
      return;
    }
    const result = await OrderService.applyCoupon(couponCode, items);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Seller Portal Routes (RBAC: SELLER or ADMIN) ─────────────────────────
app.get('/api/seller/store', requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), async (req, res) => {
  try {
    const user = (req as any).user;
    const { data: store } = await import('./config/supabase.js').then(({ supabaseAdmin }) =>
      supabaseAdmin.from('stores').select('*').eq('owner_id', user.id).maybeSingle()
    );
    res.json(store || { message: 'No store found for this seller' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/seller/orders', requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), async (req, res) => {
  try {
    const user = (req as any).user;
    const { supabaseAdmin } = await import('./config/supabase.js');
    // Find store owned by this seller
    const { data: store } = await supabaseAdmin.from('stores').select('id').eq('owner_id', user.id).maybeSingle();
    if (!store) { res.json([]); return; }

    const { data: storeOrders } = await supabaseAdmin
      .from('store_orders')
      .select('*, order_id, order_items(*), shipments(*), orders(buyer_name, buyer_phone, shipping_city)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    res.json(storeOrders || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/seller/payouts', requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), async (req, res) => {
  try {
    const user = (req as any).user;
    const { supabaseAdmin } = await import('./config/supabase.js');
    const { data: store } = await supabaseAdmin.from('stores').select('id').eq('owner_id', user.id).maybeSingle();
    if (!store) { res.json([]); return; }

    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });

    res.json(payouts || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Coupon Management for Sellers
app.post('/api/seller/coupons', requireAuth, requireRole(UserRole.SELLER, UserRole.ADMIN), async (req, res) => {
  try {
    const user = (req as any).user;
    const { supabaseAdmin } = await import('./config/supabase.js');
    const { data: store } = await supabaseAdmin.from('stores').select('id').eq('owner_id', user.id).maybeSingle();
    if (!store) { res.status(403).json({ error: 'No store found' }); return; }

    const { code, discountType, discountValue, minSpendPkr, maxDiscountPkr, expiresAt, maxUses } = req.body;
    const { data: coupon, error } = await supabaseAdmin.from('coupons').insert({
      code: code.toUpperCase(),
      store_id: store.id, // Seller-scoped by default
      discount_type: discountType || 'PERCENTAGE',
      discount_value: discountValue,
      min_spend_pkr: minSpendPkr || 0,
      max_discount_pkr: maxDiscountPkr || null,
      expires_at: expiresAt || null,
      max_uses: maxUses || null,
    }).select().single();

    if (error) { res.status(400).json({ error: error.message }); return; }
    res.status(201).json(coupon);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Logistics Webhook (PostEx Live Milestone Updates) ────────────────────
app.post('/api/logistics/postex/webhook', async (req, res) => {
  try {
    const result = await CourierService.handlePostExWebhook(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Payment Routes (PostEx XPay Unified Fintech Engine) ────────────────────
app.post('/api/payments/xpay/initiate', requireAuth, PaymentController.initiateXPay);
app.post('/api/payments/xpay/webhook', PaymentController.xpayWebhook);

// ── Search Routes (Typesense Engine) ──────────────────────────────────────
app.get('/api/search', SearchController.search);

// ── Admin Control Center (Strict Admin Guard) ─────────────────────────────
app.get('/api/admin/stats', requireAuth, requireRole(UserRole.ADMIN), AdminController.getStats);
app.get('/api/admin/sellers', requireAuth, requireRole(UserRole.ADMIN), AdminController.listSellers);
app.patch('/api/admin/sellers/:id', requireAuth, requireRole(UserRole.ADMIN), AdminController.updateSeller);
app.get('/api/admin/payouts', requireAuth, requireRole(UserRole.ADMIN), AdminController.listPayouts);
app.post('/api/admin/payouts/:id/settle', requireAuth, requireRole(UserRole.ADMIN), AdminController.settlePayout);

// ── Admin KYC Approval Routes (Phase 5) ──────────────────────────────────
app.get('/api/admin/kyc/pending', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('./config/supabase.js');
    const { data } = await supabaseAdmin
      .from('stores')
      .select('*, profiles(full_name, phone, email)')
      .eq('status', 'PENDING_KYC')
      .order('created_at', { ascending: true });
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/kyc/:storeId/approve', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('./config/supabase.js');
    await supabaseAdmin.from('stores').update({ status: 'ACTIVE', is_verified: true, updated_at: new Date().toISOString() }).eq('id', req.params.storeId);
    res.json({ success: true, message: 'Store approved and activated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/kyc/:storeId/reject', requireAuth, requireRole(UserRole.ADMIN), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('./config/supabase.js');
    await supabaseAdmin.from('stores').update({ status: 'REJECTED', updated_at: new Date().toISOString() }).eq('id', req.params.storeId);
    res.json({ success: true, message: 'Store application rejected' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

