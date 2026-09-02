CREATE INDEX IF NOT EXISTS idx_store_orders_order_id ON store_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_variant ON inventory_ledger(offer_variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ledger_reference ON inventory_ledger(reference_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_reference);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_buyer ON support_tickets(buyer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_global_status ON orders(global_status);
