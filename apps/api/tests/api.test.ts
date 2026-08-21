import { describe, it } from 'node:test';
import assert from 'node:assert';
import { RaastService } from '../src/modules/payments/raast.service.js';
import { calculateOrderSummary, PaymentMethod, SellerType } from '@waw/types';
import { expandRomanUrduQuery } from '../src/modules/search/roman-urdu-dict.js';

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
});
