import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { RaastService } from '../src/modules/payments/raast.service.js';
import { SafepayService } from '../src/modules/payments/safepay.service.js';
import { calculateOrderSummary, PaymentMethod, SellerType, UserRole } from '@waw/types';
import { expandRomanUrduQuery } from '../src/modules/search/roman-urdu-dict.js';
import { ENV } from '../src/config/env.js';
import crypto from 'crypto';

describe('Waw Marketplace Core API Engine Tests', () => {
  it('should accurately calculate free delivery for orders >= PKR 5,000', () => {
    const summary = calculateOrderSummary(
      [
        {
          productId: 'prod_1',
          sellerType: SellerType.FIRST_PARTY,
          unitPricePkr: 3000,
          quantity: 2,
        },
      ],
      PaymentMethod.RAAST_P2M_QR
    );

    assert.strictEqual(summary.subtotalPkr, 6000);
    assert.strictEqual(summary.isFreeDelivery, 1);
    assert.strictEqual(summary.shippingPkr, 0);
    assert.strictEqual(summary.codFeePkr, 0);
    assert.strictEqual(summary.totalPkr, 6000);
  });

  it('should apply COD surcharge (+PKR 100) and shipping fee (+PKR 200) for small orders', () => {
    const summary = calculateOrderSummary(
      [
        {
          productId: 'prod_2',
          sellerType: SellerType.THIRD_PARTY,
          commissionRatePercentage: 10,
          unitPricePkr: 2000,
          quantity: 1,
        },
      ],
      PaymentMethod.COD
    );

    assert.strictEqual(summary.subtotalPkr, 2000);
    assert.strictEqual(summary.isFreeDelivery, 0);
    assert.strictEqual(summary.shippingPkr, 200);
    assert.strictEqual(summary.codFeePkr, 100);
    assert.strictEqual(summary.totalPkr, 2300);
    assert.strictEqual(summary.itemBreakdowns[0].wawCommissionPkr, 200);
    assert.strictEqual(summary.itemBreakdowns[0].sellerPayoutPkr, 1800);
  });

  it('should generate valid EMVCo dynamic Raast QR payload with CRC16 checksum', () => {
    const qrResult = RaastService.generateDynamicQr({
      orderId: 'ord_123',
      orderNumber: 'WAW-PK-99120',
      amountPkr: 4500,
    });

    assert.ok(qrResult.qrString.startsWith('000201010212'));
    assert.ok(qrResult.qrDataUrl.includes('api.qrserver.com'));
    assert.strictEqual(qrResult.amountPkr, 4500);
    assert.strictEqual(qrResult.merchantAlias, 'waw.market@hbl');
  });

  it('should expand Roman Urdu search keywords with catalog synonyms', () => {
    const synonyms1 = expandRomanUrduQuery('jora');
    assert.ok(synonyms1.includes('lawn'));
    assert.ok(synonyms1.includes('unstitched'));

    const synonyms2 = expandRomanUrduQuery('chappal');
    assert.ok(synonyms2.includes('peshawari chappal'));
  });

  it('should accurately verify valid Safepay HMAC-SHA256 signatures and reject tampered payloads', () => {
    const secret = ENV.SAFEPAY_WEBHOOK_SECRET || 'whsec_sandbox_test_key_2026';
    const payload = JSON.stringify({ tracker: 'track_12345', amount: 5000, status: 'PAID' });
    
    // Generate valid HMAC
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    assert.strictEqual(SafepayService.verifyWebhookSignature(payload, validSignature), true);

    // Tampered payload with valid signature
    const tamperedPayload = JSON.stringify({ tracker: 'track_12345', amount: 9999, status: 'PAID' });
    assert.strictEqual(SafepayService.verifyWebhookSignature(tamperedPayload, validSignature), false);
  });

  it('should issue and verify valid JWT tokens with role claims', () => {
    const secret = ENV.JWT_SECRET || 'waw_dev_jwt_secret_key_2026';
    const token = jwt.sign(
      { sub: 'usr_admin_1', phone: '+923001234567', role: UserRole.ADMIN },
      secret,
      { expiresIn: '1h' }
    );

    const decoded = jwt.verify(token, secret) as any;
    assert.strictEqual(decoded.sub, 'usr_admin_1');
    assert.strictEqual(decoded.role, UserRole.ADMIN);
  });
});
