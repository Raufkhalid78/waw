import { describe, it } from "node:test";
import assert from "node:assert";
import {
  validateRefundRequest,
  resolveRefundProvider,
  buildRefundIdempotencyKey,
} from "../src/modules/payments/refund.service.js";

describe("Refund Execution Engine", () => {
  describe("validateRefundRequest — refund authorization gate", () => {
    const base = {
      amountPkr: 2500,
      orderTotalPkr: 5000,
      orderPaymentStatus: "PAID",
      alreadyRefundedPkr: 0,
    };

    it("accepts a valid partial refund against a paid order", () => {
      assert.deepStrictEqual(validateRefundRequest(base), { ok: true });
    });

    it("accepts a full refund", () => {
      assert.deepStrictEqual(
        validateRefundRequest({ ...base, amountPkr: 5000 }),
        { ok: true },
      );
    });

    it("rejects refunds on orders that were never paid", () => {
      const result = validateRefundRequest({
        ...base,
        orderPaymentStatus: "PENDING",
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.reason?.includes("order_not_paid"));
    });

    it("rejects refunds on fully refunded orders", () => {
      const result = validateRefundRequest({
        ...base,
        orderPaymentStatus: "REFUNDED",
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.reason?.includes("order_already_fully_refunded"));
    });

    it("rejects zero, negative, and non-numeric amounts", () => {
      for (const amount of [0, -100, "abc", undefined, null]) {
        const result = validateRefundRequest({ ...base, amountPkr: amount });
        assert.strictEqual(result.ok, false, `amount=${amount}`);
        assert.ok(result.reason?.includes("amount_missing_or_not_positive"));
      }
    });

    it("rejects over-refunding beyond the refundable remainder", () => {
      const result = validateRefundRequest({
        ...base,
        alreadyRefundedPkr: 2500, // 2500 already refunded -> 2500 refundable
        amountPkr: 2501,
      });
      assert.strictEqual(result.ok, false);
      assert.ok(result.reason?.includes("over_refund"));
    });

    it("allows the exact refundable remainder (paisa tolerance)", () => {
      assert.deepStrictEqual(
        validateRefundRequest({
          ...base,
          alreadyRefundedPkr: 2500,
          amountPkr: 2500,
        }),
        { ok: true },
      );
    });

    it("tolerates sub-paisa float drift on the remainder check", () => {
      assert.deepStrictEqual(
        validateRefundRequest({
          ...base,
          alreadyRefundedPkr: 2499.999,
          amountPkr: 2500,
        }),
        { ok: true },
      );
    });
  });

  describe("resolveRefundProvider — provider routing", () => {
    it("routes all online payment methods through XPAY", () => {
      for (const method of [
        "XPAY",
        "XPAY_CARD",
        "CARD",
        "RAAST",
        "JAZZCASH",
        "EASYPAISA",
      ]) {
        assert.strictEqual(resolveRefundProvider(method), "XPAY", method);
      }
    });

    it("routes COD and unknown methods to out-of-band settlement", () => {
      assert.strictEqual(resolveRefundProvider("COD"), "COD_OFFLINE");
      assert.strictEqual(resolveRefundProvider("cod"), "COD_OFFLINE");
      assert.strictEqual(resolveRefundProvider(undefined), "COD_OFFLINE");
      assert.strictEqual(resolveRefundProvider(""), "COD_OFFLINE");
    });
  });

  describe("buildRefundIdempotencyKey — double-refund guard keying", () => {
    it("keys on order + return request + amount", () => {
      const key = buildRefundIdempotencyKey({
        orderId: "ord_1",
        returnRequestId: "ret_9",
        amountPkr: 1234.5,
      });
      assert.strictEqual(key, "refund:ord_1:ret_9:1234.50");
    });

    it("falls back to the order id when no return request exists", () => {
      const key = buildRefundIdempotencyKey({
        orderId: "ord_1",
        amountPkr: 100,
      });
      assert.strictEqual(key, "refund:ord_1:ord_1:100.00");
    });

    it("produces the same key for duplicate submissions (idempotency)", () => {
      const a = buildRefundIdempotencyKey({
        orderId: "ord_2",
        returnRequestId: null,
        amountPkr: 500,
      });
      const b = buildRefundIdempotencyKey({
        orderId: "ord_2",
        amountPkr: 500,
      });
      assert.strictEqual(a, b);
    });

    it("produces different keys for different amounts", () => {
      const a = buildRefundIdempotencyKey({ orderId: "ord_3", amountPkr: 500 });
      const b = buildRefundIdempotencyKey({ orderId: "ord_3", amountPkr: 600 });
      assert.notStrictEqual(a, b);
    });
  });
});
