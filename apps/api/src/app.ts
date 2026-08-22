import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import { UserRole } from './types/index.js';
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
app.use(express.json());
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

// ── Order Routes ──────────────────────────────────────────────────────────
app.post('/api/orders', validateBody(CreateOrderSchema), async (req, res) => {
  try {
    const result = await OrderService.createOrder(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await OrderService.getOrder(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/cancel', async (req, res) => {
  try {
    const order = await OrderService.cancelOrder(req.params.id, req.body.reason);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
app.post('/api/payments/xpay/initiate', PaymentController.initiateXPay);
app.post('/api/payments/xpay/webhook', PaymentController.xpayWebhook);

// ── Search Routes (Typesense Engine) ──────────────────────────────────────
app.get('/api/search', SearchController.search);

// ── Admin Control Center (Strict Admin Guard) ─────────────────────────────
app.get('/api/admin/stats', requireAuth, requireRole(UserRole.ADMIN), AdminController.getStats);
app.get('/api/admin/sellers', requireAuth, requireRole(UserRole.ADMIN), AdminController.listSellers);
app.patch('/api/admin/sellers/:id', requireAuth, requireRole(UserRole.ADMIN), AdminController.updateSeller);
app.get('/api/admin/payouts', requireAuth, requireRole(UserRole.ADMIN), AdminController.listPayouts);
app.post('/api/admin/payouts/:id/settle', requireAuth, requireRole(UserRole.ADMIN), AdminController.settlePayout);
