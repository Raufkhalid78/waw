-- Seed Master Catalog
INSERT INTO catalog_products (id, category_id, title, slug, description, images, thumbnail) VALUES
('cat_prod_1', 'cat_audio', 'Apple AirPods Pro 2nd Gen (ANC)', 'airpods-pro-2', 'Premium true wireless earbuds with Active Noise Cancellation.', '{"https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800"}', 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400'),
('cat_prod_2', 'cat_shoes', 'Premium Norozi Peshawari Chappal', 'norozi-chappal', 'Handmade leather Peshawari chappal with double tyre sole.', '{"https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800"}', 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400');

-- Seed Offers
INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, condition, status) VALUES
('offer_1', 'cat_prod_1', 'store_1', 'SKU-AIRPODS-1', 65000, 70000, 'NEW', 'ACTIVE'),
('offer_2', 'cat_prod_2', 'store_1', 'SKU-NOROZI-1', 3500, 4500, 'NEW', 'ACTIVE');

-- Seed Variants
INSERT INTO offer_variants (id, offer_id, variant_name) VALUES
('var_1', 'offer_1', 'Default'),
('var_2', 'offer_2', 'Size 42');

-- Seed Inventory
INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES
('var_1', 'store_1', 'RESTOCK', 50, 'Initial stock'),
('var_2', 'store_1', 'RESTOCK', 20, 'Initial stock');
