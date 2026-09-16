/**
 * Cloudflare R2 storage driver tests (single-bucket layout):
 *  1. SigV4-signed request reaches the HTTP layer (no signing crash).
 *  2. Driver selection — R2 only when ALL credentials are present.
 *  3. Object keys are prefix-scoped: the logical bucket becomes a folder
 *     prefix baked into the key (and therefore into the public URL).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

test("R2 SigV4: signed request reaches the HTTP layer (no signing crash)", async () => {
  process.env.R2_ACCOUNT_ID = "testaccount1111";
  process.env.R2_ACCESS_KEY_ID = "testaccesskey";
  process.env.R2_SECRET_ACCESS_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef";

  const { R2Storage, r2Enabled } = await import("../src/modules/uploads/r2.storage.js");
  assert.equal(r2Enabled(), true, "all R2_* set → driver enabled");

  // The fake account endpoint will fail at network/TLS — that PROVES the
  // signing completed and fetch was attempted with a well-formed request.
  // A signing crash would surface as a TypeError from crypto/URL handling.
  await assert.rejects(
    () =>
      R2Storage.put("products", "u1/123-abc.jpg", Buffer.from("fakeimage"), "image/jpeg"),
    (err: any) => {
      const msg = String(err?.message || "");
      // Either an HTTP status failure or a network-level fetch failure —
      // both mean the SigV4 signing path completed successfully.
      return /R2 upload failed \(\d+\)/.test(msg) || /fetch failed|ENOTFOUND|ECONNREFUSED|ssl|tls/i.test(msg);
    },
    "put() must complete signing and attempt the HTTP call",
  );

  delete process.env.R2_ACCOUNT_ID;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
});

test("R2 driver: disabled when any credential is missing", async () => {
  process.env.R2_ACCOUNT_ID = "testaccount1111";
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;

  // Fresh import picks up the partial config (driver reads env dynamically).
  const mod = await import("../src/modules/uploads/r2.storage.js");
  assert.equal(mod.r2Enabled(), false, "partial credentials → Supabase fallback");

  delete process.env.R2_ACCOUNT_ID;
});

test("R2 layout: every logical bucket maps to a distinct folder prefix", async () => {
  const { R2_PREFIXES } = await import("../src/modules/uploads/r2.storage.js");
  const values = Object.values(R2_PREFIXES);
  assert.equal(values.length, new Set(values).size, "prefixes must be unique");
  for (const p of values) {
    assert.match(p, /^[a-z0-9-]+$/, `prefix "${p}" must be URL-safe and stable`);
    assert.ok(!p.includes("/"), "prefixes are single-level folders");
  }
});
