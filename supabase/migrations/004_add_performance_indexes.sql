-- Additional performance indexes for frequently queried columns

-- Stores: owner_id is queried in nearly every seller endpoint
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- Orders: store_id on store_orders for seller order lookups
CREATE INDEX IF NOT EXISTS idx_store_orders_store_id ON store_orders(store_id);

-- Support tickets: store_id for seller-specific ticket queries (column is store_id, not seller_id)
CREATE INDEX IF NOT EXISTS idx_support_tickets_store_id ON support_tickets(store_id);

-- Reviews: product_id for product review lookups
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- Reviews: buyer_id for user review history
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON reviews(buyer_id);

-- Coupons: store_id for seller coupon management
CREATE INDEX IF NOT EXISTS idx_coupons_store_id ON coupons(store_id);

-- Coupons: code for coupon lookup at checkout
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

-- Shipments: order_id for order shipment lookups
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);

-- Payouts: store_id for seller payout history (column is store_id, not seller_id)
CREATE INDEX IF NOT EXISTS idx_payouts_store_id ON payouts(store_id);

-- Addresses: user_id for user address lookups
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
