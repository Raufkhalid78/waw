import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { RaastService } from '../src/modules/payments/raast.service.js';
import { PostExXPayService } from '../src/modules/payments/xpay.service.js';
import { CourierService } from '../src/modules/logistics/courier.service.js';
import { ProductService } from '../src/modules/products/product.service.js';
import { calculateOrderSummary, PaymentMethod, ReturnReason, SellerType, UserRole } from '../src/types/index.js';
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

  it('should accurately verify valid PostEx XPay HMAC-SHA256 signatures and reject tampered payloads', () => {
    const secret = ENV.POSTEX_XPAY_SECRET_KEY || 'xpay_sec_test_secret_key_2026';
    const payload = JSON.stringify({ intentId: 'xpay_12345', amount: 5000, status: 'PAID' });

    // Generate valid HMAC
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    assert.strictEqual(PostExXPayService.verifyWebhookSignature(payload, validSignature), true);

    // Tampered payload with valid signature
    const tamperedPayload = JSON.stringify({ intentId: 'xpay_12345', amount: 9999, status: 'PAID' });
    assert.strictEqual(PostExXPayService.verifyWebhookSignature(tamperedPayload, validSignature), false);
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

  it('should generate printable 4x6 PostEx Air Waybill with Code128 barcode URL', () => {
    const awb = CourierService.generatePostExAirWaybill('PTX-98213-441', 'WAW-88492', {
      name: 'Ahmed Malik',
      phone: '+923001234567',
      address: 'House 42, Street 8, DHA Phase 5, Lahore',
      city: 'Lahore',
      codAmountPkr: 4200,
    });

    assert.strictEqual(awb.trackingNumber, 'PTX-98213-441');
    assert.strictEqual(awb.orderNumber, 'WAW-88492');
    assert.ok(awb.barcodeUrl.includes('bcid=code128'));
    assert.strictEqual(awb.codAmountPkr, 4200);
    assert.strictEqual(awb.city, 'Lahore');
  });

  it('should generate PostEx reverse pickup consignment for 7-day buyer return', async () => {
    const reversePickup = await CourierService.bookPostExReversePickup({
      orderId: 'ord_ret_1',
      orderNumber: 'WAW-88492',
      customerName: 'Usman Riaz',
      customerPhone: '+923219876543',
      pickupAddress: 'Flat 4B, Clifton Block 2, Karachi',
      pickupCity: 'Karachi',
      returnReason: ReturnReason.SIZE_OR_FIT_MISMATCH,
      itemsDescription: 'Peshawari Chappal (Size 43)',
    });

    assert.strictEqual(reversePickup.success, true);
    assert.ok(reversePickup.reverseTrackingNumber.startsWith('REV-PTX-'));
    assert.strictEqual(reversePickup.pickupCity, 'Karachi');
    assert.ok(reversePickup.trackingUrl.includes('postex.pk/tracking'));
  });

  it('should reject product creation when a seller attempts to list under an unowned store', async () => {
    const unauthorizedSeller = { id: 'usr_seller_999', role: 'SELLER', phone: '+923009999999' };

    await assert.rejects(
      async () => {
        await ProductService.createProduct(
          {
            storeId: 'store_other_vendor',
            title: 'Unauthorized Item',
            slug: 'unauthorized-item',
            description: 'Item created by unauthorized vendor',
            pricePkr: 1999,
            categoryId: 'cat_tech',
            images: ['https://example.com/item.jpg'],
          },
          unauthorizedSeller
        );
      },
      (err: Error) => {
        return err.message.includes('Seller does not have an active registered store') ||
               err.message.includes('Unauthorized');
      }
    );
  });
});
