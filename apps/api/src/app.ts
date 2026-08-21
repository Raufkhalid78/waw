import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';

// Controllers
import { AuthController } from './modules/auth/auth.controller.js';
import { ProductController } from './modules/products/product.controller.js';
import { OrderService } from './modules/orders/order.service.js';
import { PaymentController } from './modules/payments/payment.controller.js';
import { SearchController } from './modules/search/search.service.js';
import { AdminController } from './modules/admin/admin.controller.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Waw (واو) API Engine',
    country: 'Pakistan (PKR)',
    freeDeliveryThreshold: ENV.FREE_DELIVERY_THRESHOLD_PKR,
    codHandlingFee: ENV.DEFAULT_COD_FEE_PKR,
    timestamp: new Date().toISOString(),
  });
});

// Authentication Routes
app.post('/api/auth/whatsapp-otp/send', AuthController.requestOtp);
app.post('/api/auth/whatsapp-otp/verify', AuthController.verifyOtp);
app.post('/api/auth/oauth/sync', AuthController.syncOAuth);

// Product Routes
app.get('/api/products', ProductController.list);
app.get('/api/products/:slug', ProductController.getBySlug);
app.post('/api/products', ProductController.create);

// Order Routes
app.post('/api/orders', async (req, res) => {
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

// Payment Routes
app.post('/api/payments/safepay/initiate', PaymentController.initiateSafepay);
app.post('/api/payments/safepay/webhook', PaymentController.safepayWebhook);
app.post('/api/payments/payfast/initiate', PaymentController.initiatePayFast);
app.post('/api/payments/payfast/webhook', PaymentController.payfastWebhook);

// Search Routes (Typesense)
app.get('/api/search', SearchController.search);

// Admin Routes
app.get('/api/admin/stats', AdminController.getStats);
app.get('/api/admin/sellers', AdminController.listSellers);
app.patch('/api/admin/sellers/:id', AdminController.updateSeller);
app.get('/api/admin/payouts', AdminController.listPayouts);
app.post('/api/admin/payouts/:id/settle', AdminController.settlePayout);
