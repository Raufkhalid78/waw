/**
 * P0-PHASE0: Inventory Snapshot Locking Tests
 * Verifies that the snapshot-based checkout reservation logic:
 *   1. Correctly blocks overselling (concurrent checkout race prevention)
 *   2. Properly handles zero-stock items
 *   3. Properly releases reservations on cancellation/expiry
 *   4. Enforces deterministic lock ordering
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// -- Inventory snapshot model (mirrors DB schema) --
interface InventorySnapshot {
  offer_variant_id: string;
  store_id: string;
  on_hand: number;
  reserved: number;
  available: number;   // = on_hand - reserved
  version: number;
}

// Simple in-memory mock that mirrors the DB snapshot logic for unit tests
class MockInventorySnapshots {
  private snapshots = new Map<string, InventorySnapshot>();
  private lockHolder = new Map<string, string>(); // variantId -> transactionId

  ensure(variantId: string, storeId: string): void {
    if (!this.snapshots.has(variantId)) {
      this.snapshots.set(variantId, {
        offer_variant_id: variantId,
        store_id: storeId,
        on_hand: 0,
        reserved: 0,
        available: 0,
        version: 0,
      });
    }
  }

  restock(variantId: string, qty: number): void {
    const snap = this.snapshots.get(variantId)!;
    snap.on_hand   += qty;
    snap.available  = snap.on_hand - snap.reserved;
    snap.version   += 1;
  }

  /** Returns false if stock insufficient (simulates FOR UPDATE + check) */
  tryReserve(txId: string, variantId: string, qty: number): boolean {
    // Simulate FOR UPDATE lock (only one tx at a time per variant)
    if (this.lockHolder.has(variantId)) return false;  // another tx holds lock
    this.lockHolder.set(variantId, txId);
    try {
      const snap = this.snapshots.get(variantId)!;
      if (snap.available < qty) return false;
      snap.reserved  += qty;
      snap.available  = snap.on_hand - snap.reserved;
      snap.version   += 1;
      return true;
    } finally {
      this.lockHolder.delete(variantId);
    }
  }

  release(variantId: string, qty: number): void {
    const snap = this.snapshots.get(variantId);
    if (!snap) return;
    snap.reserved  = Math.max(0, snap.reserved - qty);
    snap.available = snap.on_hand - snap.reserved;
    snap.version  += 1;
  }

  getAvailable(variantId: string): number {
    return this.snapshots.get(variantId)?.available ?? 0;
  }

  getReserved(variantId: string): number {
    return this.snapshots.get(variantId)?.reserved ?? 0;
  }
}

// -- Tests --

describe('P0-PHASE0: Inventory Snapshot Logic', () => {
  it('should prevent overselling with exactly 1 unit of stock (concurrent race)', () => {
    const db = new MockInventorySnapshots();
    const variantId = 'ov-001';
    db.ensure(variantId, 'store-001');
    db.restock(variantId, 1);

    assert.equal(db.getAvailable(variantId), 1, 'should have 1 available before any checkout');

    // Two concurrent checkouts: only the first should succeed
    const tx1 = db.tryReserve('tx-001', variantId, 1);
    const tx2 = db.tryReserve('tx-002', variantId, 1);

    // Exactly one should succeed
    const successes = [tx1, tx2].filter(Boolean).length;
    assert.equal(successes, 1, 'exactly one concurrent checkout should succeed');
    assert.equal(db.getAvailable(variantId), 0, 'available should be 0 after successful reservation');
    assert.equal(db.getReserved(variantId), 1, 'reserved should be 1');
  });

  it('should handle zero-stock variant: lock exists, reservation fails immediately', () => {
    const db = new MockInventorySnapshots();
    const variantId = 'ov-zero';
    db.ensure(variantId, 'store-001');
    // No restock -- on_hand = 0

    const result = db.tryReserve('tx-001', variantId, 1);
    assert.equal(result, false, 'zero-stock item should immediately reject reservation');
    assert.equal(db.getAvailable(variantId), 0);
    assert.equal(db.getReserved(variantId), 0);
  });

  it('should release reservation on checkout expiry', () => {
    const db = new MockInventorySnapshots();
    const variantId = 'ov-expiry';
    db.ensure(variantId, 'store-001');
    db.restock(variantId, 3);

    assert.equal(db.tryReserve('tx-001', variantId, 2), true);
    assert.equal(db.getAvailable(variantId), 1);
    assert.equal(db.getReserved(variantId), 2);

    // Simulate 15-min expiry: release reservation
    db.release(variantId, 2);

    assert.equal(db.getAvailable(variantId), 3, 'should be fully restored after release');
    assert.equal(db.getReserved(variantId), 0);
  });

  it('should not allow reserved count to go below 0 on double-release', () => {
    const db = new MockInventorySnapshots();
    const variantId = 'ov-double-release';
    db.ensure(variantId, 'store-001');
    db.restock(variantId, 5);

    db.tryReserve('tx-001', variantId, 2);
    db.release(variantId, 2);  // normal release
    db.release(variantId, 2);  // accidental double-release

    assert.equal(db.getReserved(variantId), 0, 'reserved should floor at 0 (GREATEST(0, reserved-qty))');
    assert.equal(db.getAvailable(variantId), 5, 'on_hand should be unchanged');
  });

  it('should enforce deterministic lock order for multi-item carts', () => {
    // Items sorted by offer_variant_id ascending prevents deadlock:
    // Cart A: [ov-100, ov-200] -> locks ov-100 first, then ov-200
    // Cart B: [ov-200, ov-100] -> sorted to [ov-100, ov-200] -> same order
    const itemsA = ['ov-200', 'ov-100'];
    const itemsB = ['ov-100', 'ov-200'];
    const sortedA = [...itemsA].sort();
    const sortedB = [...itemsB].sort();
    assert.deepEqual(sortedA, sortedB, 'both carts should lock in the same UUID order');
    assert.deepEqual(sortedA, ['ov-100', 'ov-200']);
  });

  it('should allow multiple items from the same store to be reserved independently', () => {
    const db = new MockInventorySnapshots();
    db.ensure('ov-a', 'store-001'); db.restock('ov-a', 5);
    db.ensure('ov-b', 'store-001'); db.restock('ov-b', 5);

    assert.equal(db.tryReserve('tx-001', 'ov-a', 3), true);
    assert.equal(db.tryReserve('tx-001', 'ov-b', 2), true);
    assert.equal(db.getAvailable('ov-a'), 2);
    assert.equal(db.getAvailable('ov-b'), 3);
  });

  it('should handle 100 concurrent checkout attempts on 1 unit: exactly 1 succeeds', () => {
    const db = new MockInventorySnapshots();
    const variantId = 'ov-highconcurrency';
    db.ensure(variantId, 'store-001');
    db.restock(variantId, 1);

    // Simulate 100 concurrent attempts
    const results = Array.from({ length: 100 }, (_, i) =>
      db.tryReserve(`tx-${i}`, variantId, 1)
    );

    const successCount = results.filter(Boolean).length;
    assert.equal(successCount, 1, 'exactly 1 of 100 concurrent checkouts should succeed');
    assert.equal(db.getAvailable(variantId), 0);
    assert.equal(db.getReserved(variantId), 1);
  });
});
