/**
 * P0-PHASE2: Reservation Expiry Tests
 * Verifies the logic that expires pending checkout sessions and releases reservations.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mock DB representations for testing the exact business logic of the expiry RPC
class MockReservationSystem {
  public inventory = new Map<string, { on_hand: number, reserved: number }>();
  public orders = new Map<string, { id: string, status: string, created_at: Date }>();
  public orderItems = new Map<string, { order_id: string, variant_id: string, quantity: number }[]>();

  seed(variantId: string, onHand: number) {
    this.inventory.set(variantId, { on_hand: onHand, reserved: 0 });
  }

  createPendingOrder(orderId: string, variantId: string, qty: number, ageMinutes: number) {
    const createdAt = new Date(Date.now() - ageMinutes * 60000);
    this.orders.set(orderId, { id: orderId, status: 'PENDING_PAYMENT', created_at: createdAt });
    this.orderItems.set(orderId, [{ order_id: orderId, variant_id: variantId, quantity: qty }]);
    
    // Simulate initial reservation
    const inv = this.inventory.get(variantId)!;
    inv.reserved += qty;
  }

  // Matches logic in release_expired_checkout_reservations RPC
  runExpiryJob() {
    let expiredCount = 0;
    let releasedCount = 0;
    const now = new Date();

    for (const [orderId, order] of this.orders.entries()) {
      if (order.status === 'PENDING_PAYMENT') {
        const ageMs = now.getTime() - order.created_at.getTime();
        const ageMins = ageMs / 60000;

        if (ageMins >= 15) {
          order.status = 'CANCELLED';
          expiredCount++;

          const items = this.orderItems.get(orderId) || [];
          for (const item of items) {
            const inv = this.inventory.get(item.variant_id);
            if (inv) {
              inv.reserved = Math.max(0, inv.reserved - item.quantity);
              releasedCount += item.quantity;
            }
          }
        }
      }
    }
    return { expiredCount, releasedCount };
  }
}

describe('P0-PHASE2: Reservation Expiry Cron Logic', () => {
  it('should not expire orders newer than 15 minutes', () => {
    const db = new MockReservationSystem();
    db.seed('variant-1', 10);
    
    // 5 minutes old
    db.createPendingOrder('order-1', 'variant-1', 2, 5);
    
    const result = db.runExpiryJob();
    
    assert.equal(result.expiredCount, 0);
    assert.equal(result.releasedCount, 0);
    
    const inv = db.inventory.get('variant-1')!;
    assert.equal(inv.reserved, 2, 'Reservation should remain active');
    assert.equal(db.orders.get('order-1')!.status, 'PENDING_PAYMENT');
  });

  it('should expire orders older than 15 minutes and release their reservations', () => {
    const db = new MockReservationSystem();
    db.seed('variant-1', 10);
    
    // 16 minutes old
    db.createPendingOrder('order-1', 'variant-1', 3, 16);
    
    const result = db.runExpiryJob();
    
    assert.equal(result.expiredCount, 1);
    assert.equal(result.releasedCount, 3);
    
    const inv = db.inventory.get('variant-1')!;
    assert.equal(inv.reserved, 0, 'Reservation should be completely released');
    assert.equal(db.orders.get('order-1')!.status, 'CANCELLED');
  });

  it('should handle a mix of expired and active orders accurately', () => {
    const db = new MockReservationSystem();
    db.seed('variant-1', 20);
    db.seed('variant-2', 15);
    
    // Expired orders
    db.createPendingOrder('order-expired-1', 'variant-1', 2, 20);
    db.createPendingOrder('order-expired-2', 'variant-2', 4, 15.5);
    
    // Active orders
    db.createPendingOrder('order-active-1', 'variant-1', 3, 10);
    db.createPendingOrder('order-active-2', 'variant-2', 1, 2);
    
    // Total initially reserved: v1(5), v2(5)
    assert.equal(db.inventory.get('variant-1')!.reserved, 5);
    assert.equal(db.inventory.get('variant-2')!.reserved, 5);
    
    const result = db.runExpiryJob();
    
    assert.equal(result.expiredCount, 2);
    assert.equal(result.releasedCount, 6);
    
    // Remaining reserved: v1(3), v2(1)
    assert.equal(db.inventory.get('variant-1')!.reserved, 3);
    assert.equal(db.inventory.get('variant-2')!.reserved, 1);
  });
});

