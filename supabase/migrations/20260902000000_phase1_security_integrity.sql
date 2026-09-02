-- =====================================================================
-- WAW Marketplace — Phase 1 Unified Security & Data Integrity Migration
-- Date: 2026-09-02
-- Purpose: Fix dual architecture conflicts, add missing tables/columns,
--          indexes, RLS policies, triggers, and CHECK constraints.
-- WRITTEN DEFENSIVELY: Every ALTER TABLE ADD COLUMN checks first,
-- every CREATE INDEX checks column existence.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. UPDATED_AT TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables that have the column
DO $$
DECLARE
  tbl TEXT;
  tables_with_updated_at TEXT[] := ARRAY[
    'profiles','stores','categories','products','product_variants',
    'orders','payments','shipments','payouts','reviews','store_orders',
    'coupons','addresses','carts','cart_items','return_requests',
    'catalog_products','seller_offers','offer_variants','support_tickets',
    'ticket_messages'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_updated_at LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', tbl);
      EXECUTE format(
        'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
--    Each ADD COLUMN is wrapped in a DO block so if the column
--    already exists, we skip it silently.
-- ─────────────────────────────────────────────────────────────────────

-- shipments: add missing columns used by courier.service.ts
DO $$ BEGIN
  ALTER TABLE shipments ADD COLUMN courier TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE shipments ADD COLUMN is_cod BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE shipments ADD COLUMN cod_amount_pkr NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE shipments ADD COLUMN courier_cost_pkr NUMERIC DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE shipments ADD COLUMN tracking_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE shipments ADD COLUMN delivered_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- reviews: add moderation columns
DO $$ BEGIN
  ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT 'PENDING';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE reviews ADD COLUMN is_approved BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- orders: add delivered_at for 7-day return window
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- orders: add global_status if missing (migration 6 uses this)
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN global_status TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. ADD MISSING TABLES
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY DEFAULT ('stk_' || gen_random_uuid()::text),
  buyer_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  store_id TEXT REFERENCES stores(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_images TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution TEXT,
  staff_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id TEXT PRIMARY KEY DEFAULT ('msg_' || gen_random_uuid()::text),
  ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT 'User',
  message TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- 4. ADD MISSING INDEXES
--    Each CREATE INDEX checks column existence first to avoid errors
--    when the column was never added to the table.
-- ─────────────────────────────────────────────────────────────────────

-- seller_offers indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_offers' AND column_name='catalog_product_id') THEN
    CREATE INDEX IF NOT EXISTS idx_seller_offers_catalog_product ON seller_offers(catalog_product_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_offers' AND column_name='store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_seller_offers_store ON seller_offers(store_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_offers' AND column_name='status') THEN
    CREATE INDEX IF NOT EXISTS idx_seller_offers_status ON seller_offers(status);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_offers' AND column_name='store_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_offers' AND column_name='status') THEN
    CREATE INDEX IF NOT EXISTS idx_seller_offers_store_status ON seller_offers(store_id, status);
  END IF;
END $$;

-- offer_variants indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='offer_variants' AND column_name='offer_id') THEN
    CREATE INDEX IF NOT EXISTS idx_offer_variants_offer ON offer_variants(offer_id);
  END IF;
END $$;

-- inventory_ledger indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_ledger' AND column_name='offer_variant_id') THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_ledger_variant ON inventory_ledger(offer_variant_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_ledger' AND column_name='store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_ledger_store ON inventory_ledger(store_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory_ledger' AND column_name='reference_id') THEN
    CREATE INDEX IF NOT EXISTS idx_inventory_ledger_reference ON inventory_ledger(reference_id);
  END IF;
END $$;

-- catalog_products indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='catalog_products' AND column_name='category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_catalog_products_category ON catalog_products(category_id);
  END IF;
END $$;

-- store_orders indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_orders' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_store_orders_order ON store_orders(order_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_orders' AND column_name='store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_store_orders_store ON store_orders(store_id);
  END IF;
END $$;

-- payouts indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payouts' AND column_name='store_id') THEN
    CREATE INDEX IF NOT EXISTS idx_payouts_store ON payouts(store_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payouts' AND column_name='status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payouts' AND column_name='scheduled_for') THEN
    CREATE INDEX IF NOT EXISTS idx_payouts_status_scheduled ON payouts(status, scheduled_for);
  END IF;
END $$;

-- orders indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='order_status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(order_status, created_at);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='buyer_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_orders_buyer_created ON orders(buyer_id, created_at);
  END IF;
END $$;

-- return_requests indexes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='return_requests' AND column_name='order_id') THEN
    CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='return_requests' AND column_name='buyer_id') THEN
    CREATE INDEX IF NOT EXISTS idx_return_requests_buyer ON return_requests(buyer_id);
  END IF;
END $$;

-- support_tickets indexes
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_support_tickets_buyer ON support_tickets(buyer_id);
  CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
  CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
END $$;

-- ticket_messages indexes
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 5. ADD RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Buyers can view their own tickets"
    ON support_tickets FOR SELECT
    USING (buyer_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Buyers can create tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (buyer_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all tickets"
    ON support_tickets FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update all tickets"
    ON support_tickets FOR UPDATE
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Ticket participants can view messages"
    ON ticket_messages FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM support_tickets st
        WHERE st.id = ticket_messages.ticket_id
        AND (st.buyer_id = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN'))
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Ticket participants can insert messages"
    ON ticket_messages FOR INSERT
    WITH CHECK (
      sender_id = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM support_tickets st
        WHERE st.id = ticket_messages.ticket_id
        AND (st.buyer_id = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role IN ('ADMIN', 'SUPPORT')))
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own carts"
    ON carts FOR ALL
    USING (user_id = auth.uid()::text OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage items in their carts"
    ON cart_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM carts
        WHERE carts.id = cart_items.cart_id
        AND (carts.user_id = auth.uid()::text OR carts.user_id IS NULL)
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Buyers can view their own returns"
    ON return_requests FOR SELECT
    USING (buyer_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Buyers can create return requests"
    ON return_requests FOR INSERT
    WITH CHECK (buyer_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage all returns"
    ON return_requests FOR ALL
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Return item access via return_request ownership"
    ON return_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM return_requests
        WHERE return_requests.id = return_items.return_request_id
        AND (return_requests.buyer_id = auth.uid()::text
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN'))
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can view approved reviews"
    ON reviews FOR SELECT
    USING (is_approved = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Buyers can create reviews"
    ON reviews FOR INSERT
    WITH CHECK (buyer_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can moderate reviews"
    ON reviews FOR UPDATE
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own addresses"
    ON addresses FOR ALL
    USING (user_id = auth.uid()::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can view active coupons"
    ON coupons FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage coupons"
    ON coupons FOR ALL
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 6. ADD CHECK CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='seller_offers' AND column_name='price_pkr') THEN
    ALTER TABLE seller_offers ADD CONSTRAINT chk_seller_offers_price_positive CHECK (price_pkr > 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='quantity') THEN
    ALTER TABLE order_items ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity > 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_items' AND column_name='price_pkr') THEN
    ALTER TABLE order_items ADD CONSTRAINT chk_order_items_price_non_negative CHECK (price_pkr >= 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_orders' AND column_name='subtotal_pkr') THEN
    ALTER TABLE store_orders ADD CONSTRAINT chk_store_orders_subtotal_non_negative CHECK (subtotal_pkr >= 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='store_orders' AND column_name='commission_pkr') THEN
    ALTER TABLE store_orders ADD CONSTRAINT chk_store_orders_commission_non_negative CHECK (commission_pkr >= 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cart_items' AND column_name='quantity') THEN
    ALTER TABLE cart_items ADD CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity > 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coupons' AND column_name='discount_value') THEN
    ALTER TABLE coupons ADD CONSTRAINT chk_coupons_discount_positive CHECK (discount_value > 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coupons' AND column_name='current_uses') THEN
    ALTER TABLE coupons ADD CONSTRAINT chk_coupons_uses_non_negative CHECK (current_uses >= 0);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 7. UNIQUE CONSTRAINT ON payouts.store_order_id
-- ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payouts' AND column_name='store_order_id') THEN
    ALTER TABLE payouts ADD CONSTRAINT uq_payouts_store_order UNIQUE (store_order_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 8. GRANT PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;
GRANT SELECT, INSERT ON ticket_messages TO authenticated;
GRANT ALL ON support_tickets TO service_role;
GRANT ALL ON ticket_messages TO service_role;
