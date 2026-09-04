-- Additional performance indexes for frequently queried columns

-- Stores: owner_id is queried in nearly every seller endpoint
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

-- Orders: store_id on store_orders for seller order lookups
CREATE INDEX IF NOT EXISTS idx_store_orders_store_id ON store_orders(store_id);

-- Support tickets: seller_id for seller-specific ticket queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_seller_id ON support_tickets(seller_id);

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

-- Disputes: order_id for dispute lookups
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);

-- Disputes: buyer_id for buyer dispute history
CREATE INDEX IF NOT EXISTS idx_disputes_buyer_id ON disputes(buyer_id);

-- Payouts: seller_id for seller payout history
CREATE INDEX IF NOT EXISTS idx_payouts_seller_id ON payouts(seller_id);

-- Addresses: user_id for user address lookups
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- Product views: product_id for view count aggregation
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);

-- Product views: viewed_at for time-range queries
CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at ON product_views(viewed_at);

-- Cart items: guest_token for guest cart lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_guest_token ON cart_items(guest_token);

-- Cart items: user_id for authenticated cart lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
