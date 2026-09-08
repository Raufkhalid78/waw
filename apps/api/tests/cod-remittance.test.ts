import { describe, it } from "node:test";
import assert from "node:assert";
import {
  decideRemittanceUpdate,
  shouldHoldCodPayout,
} from "../src/modules/payments/cod-remittance.service.js";

describe("COD Remittance Engine", () => {
  describe("decideRemittanceUpdate — cash confirmation gate", () => {
    it("marks PAID only on explicit provider confirmation", () => {
      assert.strictEqual(decideRemittanceUpdate(true), "mark_paid");
    });

    it("keeps AWAITING on explicit not-yet-remitted", () => {
      assert.strictEqual(decideRemittanceUpdate(false), "keep_awaiting");
    });

    it("keeps AWAITING on null/undefined/unrecognised payloads (never guesses)", () => {
      assert.strictEqual(decideRemittanceUpdate(null), "unknown");
      assert.strictEqual(decideRemittanceUpdate(undefined), "unknown");
      assert.strictEqual(decideRemittanceUpdate("yes"), "unknown");
      assert.strictEqual(decideRemittanceUpdate(1), "unknown");
      assert.strictEqual(decideRemittanceUpdate({}), "unknown");
    });
  });

  describe("shouldHoldCodPayout — seller payout vs collected cash", () => {
    it("holds the payout while cash is unconfirmed", () => {
      assert.strictEqual(shouldHoldCodPayout("AWAITING_COD_REMITTANCE"), true);
    });

    it("releases once cash is confirmed (PAID)", () => {
      assert.strictEqual(shouldHoldCodPayout("PAID"), false);
    });

    it("never holds non-COD or unknown states", () => {
      assert.strictEqual(shouldHoldCodPayout("REFUNDED"), false);
      assert.strictEqual(shouldHoldCodPayout(undefined), false);
      assert.strictEqual(shouldHoldCodPayout(null), false);
      assert.strictEqual(shouldHoldCodPayout(""), false);
    });
  });
});
