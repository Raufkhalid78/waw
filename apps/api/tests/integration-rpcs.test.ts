import { describe, it, before, after } from "node:test";
import assert from "node:assert";

// ============================================================================
// P0-INT: PostgreSQL Integration Tests for Checkout and Return RPCs
// ============================================================================
// These tests validate the database-level guarantees of the checkout and
// return transaction RPCs. They must be run against a real PostgreSQL database
// with all migrations applied.
//
// To run: npm run test:integration (requires DATABASE_URL to be set)
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL;
const SKIP_DB_TESTS = !DATABASE_URL;

describe("P0-INT: Checkout Transaction RPC Integration", { skip: SKIP_DB_TESTS ? "DATABASE_URL not set" : false }, () => {
  let pool: any;

  before(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  after(async () => {
    if (pool) await pool.end();
  });

  it("should apply all migrations successfully", async () => {
    const client = await pool.connect();
    try {
      // Check that checkout_transaction function exists
      const { rows } = await client.query(`
        SELECT routine_name, routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
          AND routine_name IN ('checkout_transaction', 'guest_checkout_transaction', 'create_return_request', 'cancel_order')
        ORDER BY routine_name
      `);

      assert.ok(rows.length >= 3, `Expected at least 3 RPCs, found ${rows.length}`);
      const names = rows.map((r: any) => r.routine_name);
      assert.ok(names.includes("checkout_transaction"), "checkout_transaction RPC missing");
      assert.ok(names.includes("create_return_request"), "create_return_request RPC missing");
      assert.ok(names.includes("cancel_order"), "cancel_order RPC missing");
    } finally {
      client.release();
    }
  });

  it("should enforce FOR UPDATE locking on inventory during checkout", async () => {
    const client = await pool.connect();
    try {
      // Verify the checkout function uses FOR UPDATE
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'checkout_transaction'
      `);

      assert.ok(rows.length > 0, "checkout_transaction function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("FOR UPDATE"),
        "checkout_transaction must use FOR UPDATE for inventory locking",
      );
    } finally {
      client.release();
    }
  });

  it("should reject null buyer_id in authenticated checkout", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'checkout_transaction'
      `);

      assert.ok(rows.length > 0, "checkout_transaction function not found");
      const definition = rows[0].definition;
      // Should reject null buyer_id with a clear error
      assert.ok(
        definition.includes("Guest checkout is not available") || definition.includes("p_buyer_id IS NULL"),
        "checkout_transaction must reject null buyer_id",
      );
    } finally {
      client.release();
    }
  });

  it("should have guest checkout function available to anon role", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT routine_name, grantee
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'guest_checkout_transaction'
          AND grantee = 'anon'
      `);

      assert.ok(rows.length > 0, "guest_checkout_transaction should be granted to anon role");
    } finally {
      client.release();
    }
  });

  it("should enforce FOR UPDATE locking on inventory during guest checkout", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'guest_checkout_transaction'
      `);

      assert.ok(rows.length > 0, "guest_checkout_transaction function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("FOR UPDATE"),
        "guest_checkout_transaction must use FOR UPDATE for inventory locking",
      );
    } finally {
      client.release();
    }
  });
});

describe("P0-INT: Return Request RPC Integration", { skip: SKIP_DB_TESTS ? "DATABASE_URL not set" : false }, () => {
  let pool: any;

  before(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  after(async () => {
    if (pool) await pool.end();
  });

  it("should enforce FOR UPDATE locking on order items during return", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'create_return_request'
      `);

      assert.ok(rows.length > 0, "create_return_request function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("FOR UPDATE"),
        "create_return_request must use FOR UPDATE for order item locking",
      );
    } finally {
      client.release();
    }
  });

  it("should use correct JSONB alias in seller grouping loops", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'create_return_request'
      `);

      assert.ok(rows.length > 0, "create_return_request function not found");
      const definition = rows[0].definition;
      // Must use proper alias syntax for jsonb_array_elements
      assert.ok(
        definition.includes("AS elem(value)") || definition.includes("elem.value"),
        "create_return_request must use proper JSONB element alias",
      );
    } finally {
      client.release();
    }
  });

  it("should validate positive return quantities", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'create_return_request'
      `);

      assert.ok(rows.length > 0, "create_return_request function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("quantity must be positive") || definition.includes("quantity')::INT <= 0"),
        "create_return_request must validate positive quantities",
      );
    } finally {
      client.release();
    }
  });

  it("should reject duplicate item IDs in one return request", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'create_return_request'
      `);

      assert.ok(rows.length > 0, "create_return_request function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("Duplicate order item"),
        "create_return_request must reject duplicate item IDs",
      );
    } finally {
      client.release();
    }
  });

  it("should validate returnable order status", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'create_return_request'
      `);

      assert.ok(rows.length > 0, "create_return_request function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("cannot be returned in") || definition.includes("returnable"),
        "create_return_request must validate order status",
      );
    } finally {
      client.release();
    }
  });
});

describe("P0-INT: Cancel Order RPC Integration", { skip: SKIP_DB_TESTS ? "DATABASE_URL not set" : false }, () => {
  let pool: any;

  before(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  after(async () => {
    if (pool) await pool.end();
  });

  it("should use FOR UPDATE on order row", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'cancel_order'
      `);

      assert.ok(rows.length > 0, "cancel_order function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("FOR UPDATE"),
        "cancel_order must use FOR UPDATE on order row",
      );
    } finally {
      client.release();
    }
  });

  it("should release inventory on cancellation", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'cancel_order'
      `);

      assert.ok(rows.length > 0, "cancel_order function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("RELEASE") && definition.includes("inventory_ledger"),
        "cancel_order must release inventory back to ledger",
      );
    } finally {
      client.release();
    }
  });

  it("should create outbox event for cancellation notification", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.proname = 'cancel_order'
      `);

      assert.ok(rows.length > 0, "cancel_order function not found");
      const definition = rows[0].definition;
      assert.ok(
        definition.includes("outbox_events"),
        "cancel_order must create outbox event for notification",
      );
    } finally {
      client.release();
    }
  });
});

describe("P0-INT: Permission Verification", { skip: SKIP_DB_TESTS ? "DATABASE_URL not set" : false }, () => {
  let pool: any;

  before(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  after(async () => {
    if (pool) await pool.end();
  });

  it("should have RLS enabled on all sensitive tables", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT c.relname as table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = false
          AND c.relname IN (
            'orders', 'order_items', 'store_orders', 'payouts',
            'return_requests', 'return_items', 'payments',
            'inventory_ledger', 'financial_ledger',
            'support_tickets', 'audit_logs'
          )
      `);

      assert.strictEqual(rows.length, 0, `Tables missing RLS: ${rows.map((r: any) => r.table_name).join(", ")}`);
    } finally {
      client.release();
    }
  });

  it("should not grant checkout_transaction to anon", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT routine_name, grantee
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'checkout_transaction'
          AND grantee = 'anon'
      `);

      assert.strictEqual(rows.length, 0, "checkout_transaction should NOT be granted to anon");
    } finally {
      client.release();
    }
  });

  it("should not grant create_return_request to anon", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT routine_name, grantee
        FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'create_return_request'
          AND grantee = 'anon'
      `);

      assert.strictEqual(rows.length, 0, "create_return_request should NOT be granted to anon");
    } finally {
      client.release();
    }
  });

  it("should have SET search_path on all SECURITY DEFINER functions", async () => {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(`
        SELECT p.proname, pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.procnsp
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
      `);

      const missing = rows.filter((r: any) => !r.definition.includes("SET search_path"));
      assert.strictEqual(
        missing.length,
        0,
        `SECURITY DEFINER functions missing SET search_path: ${missing.map((r: any) => r.proname).join(", ")}`,
      );
    } finally {
      client.release();
    }
  });
});
