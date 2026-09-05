-- ============================================================================
-- WAW MARKETPLACE — SEED DATA (Demo / Development)
-- ============================================================================
-- Run AFTER SCHEMA_COMPLETE.sql to populate demo data.
-- Use CLEANUP_SEED.sql to remove all demo data later.
-- ============================================================================

-- ── 1. System Admin User ────────────────────────────────────────────────────
-- Creates a Supabase auth user + profile for the admin panel.

DO $$
DECLARE
  sys_user_id TEXT := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = sys_user_id::uuid) THEN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (sys_user_id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'admin@waw.com.pk', crypt('${ADMIN_PASSWORD:-ChangeMeInProduction!}', gen_salt('bf')),
            NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = sys_user_id) THEN
    INSERT INTO profiles (id, full_name, phone, email, role, is_active, is_whatsapp_verified)
    VALUES (sys_user_id, 'Waw Admin', '+923001234567', 'admin@waw.com.pk', 'ADMIN', true, true);
  END IF;
END $$;

-- ── 2. Categories ───────────────────────────────────────────────────────────

INSERT INTO categories (id, name, name_urdu, slug, parent_id, sort_order, is_active, image_url, description) VALUES
  ('cat_electronics', 'Electronics & Mobility', 'الیکٹرانکس اور موبائل', 'mobiles-tech', NULL, 1, true, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80', 'Smartphones, ANC audio, wearables and chargers.'),
  ('cat_fashion', 'Fashion & Apparel', 'فیشن اور ملبوسات', 'fashion', NULL, 2, true, 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80', 'Women unstitched lawn, festive silk, and ready-to-wear collections.'),
  ('cat_leather', 'Leather Craft & Footwear', 'چمڑے کا سامان اور جوتے', 'leather-craft', NULL, 3, true, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80', 'Pure cowhide leather wallets, bags, and handmade traditional footwear.'),
  ('cat_beauty', 'Beauty & Fragrance', 'خوبصورتی اور عطر', 'beauty-fragrance', NULL, 4, true, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80', 'Authentic non-alcoholic attar, pure oud, and grooming essentials.'),
  ('cat_sports', 'Sports & Outdoors', 'کھیلوں کا سامان', 'sialkot-sports', NULL, 5, true, 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80', 'Sialkot export-grade match footballs, English willow bats and gear.'),
  ('cat_home', 'Home & Living', 'گھریلو سجاوٹ اور سامان', 'home-living', NULL, 6, true, 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300&auto=format&fit=crop&q=80', 'Décor, lighting, bedsheets, and artisan kitchen essentials.'),
  ('cat_heritage', 'Pakistani Heritage & Handmade', 'پاکستانی ثقافت اور دستکاری', 'home-heritage', NULL, 7, true, 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300&auto=format&fit=crop&q=80', 'Multani blue pottery, handmade brass art, and cultural souvenirs.')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, name_urdu = EXCLUDED.name_urdu, image_url = EXCLUDED.image_url, description = EXCLUDED.description;

INSERT INTO categories (id, name, name_urdu, slug, parent_id, sort_order, is_active) VALUES
  ('cat_audio', 'Audio & Wireless Earbuds', 'وائرلیس ایئربڈز اور آڈیو', 'wireless-earbuds', 'cat_electronics', 1, true),
  ('cat_watches', 'Smart Watches & Wearables', 'سمارٹ واچز', 'smart-watches', 'cat_electronics', 2, true),
  ('cat_lawn', 'Women Unstitched & Lawn', 'خواتین کے ان سلے لان سوٹ', 'womens-lawn', 'cat_fashion', 1, true),
  ('cat_shoes', 'Handmade Peshawari Chappal', 'ہاتھ سے بنی پشاوری چپل', 'peshawari-chappal', 'cat_leather', 1, true),
  ('cat_attar', 'Pure Attar & Concentrated Oils', 'خالص عطر اور پرفیوم آئلز', 'attar-fragrance', 'cat_beauty', 1, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;

-- ── 3. Serviceable Cities ───────────────────────────────────────────────────

INSERT INTO serviceable_cities (city_name, province, is_cod_eligible, is_active) VALUES
  ('Lahore', 'Punjab', true, true),
  ('Karachi', 'Sindh', true, true),
  ('Islamabad', 'Federal', true, true),
  ('Rawalpindi', 'Punjab', true, true),
  ('Faisalabad', 'Punjab', true, true),
  ('Multan', 'Punjab', true, true),
  ('Peshawar', 'KPK', true, true),
  ('Quetta', 'Balochistan', true, true),
  ('Sialkot', 'Punjab', true, true),
  ('Gujranwala', 'Punjab', true, true)
ON CONFLICT (city_name) DO NOTHING;

-- ── 4. Search Suggestions ───────────────────────────────────────────────────

INSERT INTO search_suggestions (term, score, is_active) VALUES
  ('Khaadi Lawn 2026', 100, true),
  ('AirPods Pro ANC', 90, true),
  ('Pure Leather Wallet', 85, true),
  ('Peshawari Chappal', 80, true),
  ('Amoled Smart Watch', 75, true),
  ('Sialkot Match Football', 70, true),
  ('Royal Oud Attar', 65, true)
ON CONFLICT (term) DO UPDATE SET score = EXCLUDED.score;

-- ── 5. Campaigns ────────────────────────────────────────────────────────────

INSERT INTO campaigns (tag, title, link_url, link_text, campaign_type, sort_order) VALUES
  ('⚡ MEGA DEALS', 'Azadi Celebration: Up to 50% OFF with voucher AZADI2026 at checkout!', '/category/mobiles-tech', 'Shop Deals', 'PROMO_STRIP', 1),
  ('🚚 FREE DELIVERY', 'Zero shipping charges on all orders above PKR 5,000 nationwide across Pakistan.', '/cart', 'Learn More', 'PROMO_STRIP', 2),
  ('🛡️ SECURE CHECKOUT', '100% Safe Prepayments & 7-Day Hassle-Free Returns with Escrow Buyer Protection.', '/buyer-protection', 'View Guarantee', 'PROMO_STRIP', 3),
  ('🏪 SELL ON WAW', '0% Listing Fees & Nationwide PostEx Pickups for verified Pakistani merchants.', '/sell', 'Register Store', 'PROMO_STRIP', 4)
ON CONFLICT DO NOTHING;

-- ── 6. CMS Content ──────────────────────────────────────────────────────────

INSERT INTO cms_content (key_slug, type, title, content_html, is_active) VALUES
  ('buyer-protection-claim', 'claim', 'Verified Pakistani Merchants',
   'Direct from verified Pakistani sellers with doorstep delivery and dedicated customer care.', true)
ON CONFLICT (key_slug) DO UPDATE SET title = EXCLUDED.title, content_html = EXCLUDED.content_html;

-- ── 7. Marketplace Settings ─────────────────────────────────────────────────

INSERT INTO marketplace_settings (key, value, description) VALUES
  ('marketplace_name', '"Waw"', 'Display name of the marketplace'),
  ('default_currency', '"PKR"', 'Default currency code'),
  ('default_commission_pct', '10', 'Default platform commission percentage'),
  ('free_delivery_threshold', '5000', 'Free delivery threshold in PKR'),
  ('default_shipping_fee', '200', 'Default shipping fee in PKR'),
  ('cod_fee', '100', 'Cash on delivery handling fee in PKR'),
  ('whatsapp_number', '"+923001234567"', 'Business WhatsApp number'),
  ('support_email', '"support@waw.pk"', 'Support email address')
ON CONFLICT (key) DO NOTHING;

-- ── 8. Demo Stores ──────────────────────────────────────────────────────────

DO $$
DECLARE
  sys_id TEXT := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- 1P Flagship Store
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = 'store-1p-flagship') THEN
    INSERT INTO stores (id, owner_id, name, slug, seller_type, status, commission_rate_percentage, city, address, is_verified)
    VALUES ('store-1p-flagship', sys_id, 'Waw Flagship Store', 'waw-flagship', 'FIRST_PARTY', 'ACTIVE', 10, 'Lahore', 'Waw HQ, Lahore', true);
  END IF;

  -- 3P Demo Store
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = 'store-3p-heritage') THEN
    INSERT INTO stores (id, owner_id, name, slug, seller_type, status, commission_rate_percentage, city, address, is_verified)
    VALUES ('store-3p-heritage', sys_id, 'Peshawar Heritage Crafts', 'peshawar-heritage', 'THIRD_PARTY', 'ACTIVE', 10, 'Peshawar', 'Qissa Khwani Bazaar, Peshawar', true);
  END IF;

  -- 3P Fashion Store
  IF NOT EXISTS (SELECT 1 FROM stores WHERE id = 'store-3p-fashion') THEN
    INSERT INTO stores (id, owner_id, name, slug, seller_type, status, commission_rate_percentage, city, address, is_verified)
    VALUES ('store-3p-fashion', sys_id, 'Lahore Lawn House', 'lahore-lawn-house', 'THIRD_PARTY', 'ACTIVE', 10, 'Lahore', 'Liberty Market, Lahore', true);
  END IF;
END $$;

-- ── 9. Demo Catalog Products ────────────────────────────────────────────────

INSERT INTO catalog_products (id, category_id, title, title_urdu, slug, brand, description, images, is_active) VALUES
  ('cpd-airpods', 'cat_audio', 'Apple AirPods Pro 2nd Gen (USB-C)', 'ایپل ایئر پوڈز پرو 2', 'apple-airpods-pro-2', 'Apple', 'Active Noise Cancellation, Adaptive Transparency, USB-C MagSafe case.', ARRAY['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600'], true),
  ('cpd-chappal', 'cat_shoes', 'Premium Handmade Peshawari Chappal', 'پریمیم پشاوری چپل', 'premium-peshawari-chappal', 'Heritage', 'Hand-stitched pure leather Norozi Peshawari chappal with tyre sole.', ARRAY['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600'], true),
  ('cpd-watch', 'cat_watches', 'Samsung Galaxy Watch 6 Classic', 'سامسونگ گیلاکسی واچ 6', 'samsung-galaxy-watch-6', 'Samsung', 'Rotating bezel, BioActive Sensor, WearOS, Sapphire Crystal.', ARRAY['https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600'], true),
  ('cpd-attar', 'cat_attar', 'Oud Al Madinah Pure Attar 12ml', 'عودالمدینہ خالص عطر', 'oud-al-madinah-attar', 'Swiss Arabian', 'Long-lasting alcohol-free concentrated oil, woody oriental blend.', ARRAY['https://images.unsplash.com/photo-1541643600914-78b084683601?w=600'], true),
  ('cpd-football', 'cat_sports', 'FIFA Approved Match Football (Size 5)', 'فیفا من�� میچ فٹ بال', 'fifa-match-football', 'Forward', 'Hand-stitched thermally bonded panels, FIFA Quality Pro certified.', ARRAY['https://images.unsplash.com/photo-1614632537423-14e2b986e286?w=600'], true),
  ('cpd-lawn', 'cat_lawn', 'Khaadi Luxury Unstitched 3-Piece Lawn', 'خادی لکچری لان 3 پیس', 'khaadi-lawn-3pc', 'Khaadi', 'Embroidered lawn shirt, digital print trousers, chiffon dupatta.', ARRAY['https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600'], true),
  ('cpd-wallet', 'cat_leather', 'Genuine Leather Bifold Wallet', 'اصیل چمڑے کا بائیفولڈ والیٹ', 'leather-bifold-wallet', 'Waw Leather', 'Full-grain cowhide, RFID blocking, 8 card slots, coin pocket.', ARRAY['https://images.unsplash.com/photo-1627123424574-724758594e93?w=600'], true),
  ('cpd-pottery', 'cat_heritage', 'Multani Blue Pottery Flower Vase', 'ملتانی بلیو پوٹری پھول کا گملہ', 'multani-blue-pottery-vase', 'Multan Arts', 'Hand-painted traditional Multani blue pottery, food-safe glaze.', ARRAY['https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600'], true)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, images = EXCLUDED.images, is_active = true;

-- ── 10. Demo Seller Offers + Variants + Inventory ───────────────────────────

DO $$
DECLARE
  v_offer_id TEXT;
  v_variant_id TEXT;
BEGIN
  -- AirPods Pro — 1P Flagship
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-airpods-1p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, is_express, status)
    VALUES ('off-airpods-1p', 'cpd-airpods', 'store-1p-flagship', 'SKU-AIRPODS-01', 65000, 72000, true, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES ('var-airpods-std', 'off-airpods-1p', 'Standard', 0);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES ('var-airpods-std', 'store-1p-flagship', 'RESTOCK', 50, 'Initial demo stock');
  END IF;

  -- Peshawari Chappal — 3P Heritage
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-chappal-3p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, status)
    VALUES ('off-chappal-3p', 'cpd-chappal', 'store-3p-heritage', 'SKU-CHAPPAL-01', 4500, 5500, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES
      ('var-chappal-8', 'off-chappal-3p', 'Size 8', 0),
      ('var-chappal-9', 'off-chappal-3p', 'Size 9', 0),
      ('var-chappal-10', 'off-chappal-3p', 'Size 10', 0),
      ('var-chappal-11', 'off-chappal-3p', 'Size 11', 200);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES
      ('var-chappal-8', 'store-3p-heritage', 'RESTOCK', 30, 'Initial demo stock'),
      ('var-chappal-9', 'store-3p-heritage', 'RESTOCK', 40, 'Initial demo stock'),
      ('var-chappal-10', 'store-3p-heritage', 'RESTOCK', 35, 'Initial demo stock'),
      ('var-chappal-11', 'store-3p-heritage', 'RESTOCK', 20, 'Initial demo stock');
  END IF;

  -- Galaxy Watch — 1P Flagship
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-watch-1p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, is_express, status)
    VALUES ('off-watch-1p', 'cpd-watch', 'store-1p-flagship', 'SKU-WATCH-01', 55000, 62000, true, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES ('var-watch-47', 'off-watch-1p', '47mm', 3000);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES ('var-watch-47', 'store-1p-flagship', 'RESTOCK', 25, 'Initial demo stock');
  END IF;

  -- Attar — 3P Heritage
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-attar-3p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, status)
    VALUES ('off-attar-3p', 'cpd-attar', 'store-3p-heritage', 'SKU-ATTAR-01', 2800, 3500, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES ('var-attar-12ml', 'off-attar-3p', '12ml', 0);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES ('var-attar-12ml', 'store-3p-heritage', 'RESTOCK', 100, 'Initial demo stock');
  END IF;

  -- Football — 1P Flagship
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-football-1p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, is_express, status)
    VALUES ('off-football-1p', 'cpd-football', 'store-1p-flagship', 'SKU-FOOTBALL-01', 3500, 4200, true, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES ('var-football-std', 'off-football-1p', 'Standard', 0);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES ('var-football-std', 'store-1p-flagship', 'RESTOCK', 60, 'Initial demo stock');
  END IF;

  -- Lawn — 3P Fashion
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-lawn-3p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, status)
    VALUES ('off-lawn-3p', 'cpd-lawn', 'store-3p-fashion', 'SKU-LAWN-01', 8500, 9800, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES ('var-lawn-sm', 'off-lawn-3p', 'Small', -500);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES ('var-lawn-sm', 'store-3p-fashion', 'RESTOCK', 40, 'Initial demo stock');
  END IF;

  -- Wallet — 3P Heritage
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-wallet-3p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, status)
    VALUES ('off-wallet-3p', 'cpd-wallet', 'store-3p-heritage', 'SKU-WALLET-01', 1800, 2200, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES ('var-wallet-brn', 'off-wallet-3p', 'Brown', 0);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES ('var-wallet-brn', 'store-3p-heritage', 'RESTOCK', 80, 'Initial demo stock');
  END IF;

  -- Pottery — 3P Heritage
  IF NOT EXISTS (SELECT 1 FROM seller_offers WHERE id = 'off-pottery-3p') THEN
    INSERT INTO seller_offers (id, catalog_product_id, store_id, sku, price_pkr, original_price_pkr, status)
    VALUES ('off-pottery-3p', 'cpd-pottery', 'store-3p-heritage', 'SKU-POTTERY-01', 3200, 4000, 'ACTIVE');
    INSERT INTO offer_variants (id, offer_id, variant_name, price_adjustment_pkr) VALUES ('var-pottery-lg', 'off-pottery-3p', 'Large', 500);
    INSERT INTO inventory_ledger (offer_variant_id, store_id, transaction_type, quantity, notes) VALUES ('var-pottery-lg', 'store-3p-heritage', 'RESTOCK', 25, 'Initial demo stock');
  END IF;
END $$;

-- ── 11. Demo Coupon ─────────────────────────────────────────────────────────

INSERT INTO coupons (id, code, discount_type, discount_value, min_spend_pkr, max_discount_pkr, max_uses, is_active)
VALUES ('coupon-demo-azadi', 'AZADI2026', 'PERCENTAGE', 15, 3000, 2000, 500, true)
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- ============================================================================
-- SEED COMPLETE — 8 products across 3 stores, ready for checkout testing.
-- ============================================================================
