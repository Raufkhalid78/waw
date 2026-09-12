-- ==============================================================================
-- 053: Production category taxonomy (Pakistan marketplace) + tree helpers
-- ==============================================================================
-- The categories table (001) already supports parent/subcategories, but no
-- production data was ever seeded — categories only existed if hand-created
-- in the admin panel. Meanwhile:
--   * The seller portal hardcoded fake category ids (cat_lawn, cat_leather...)
--     that match no database row, so FK violations broke all product creation.
--   * Migration 037 set commission_percentage by slug for categories
--     (fashion, mobiles-tech, ...) that were never seeded.
--
-- This migration seeds the launch taxonomy: 8 top-level categories with
-- Pakistani-relevant subcategories, bilingual names (EN/Urdu), icons/images
-- placeholders, and per-category commission rates aligned with 037's intent.
-- Idempotent: keyed on slug (ON CONFLICT DO NOTHING) — safe to re-run and
-- on databases where admins already created some of these by hand.
--
-- Structure: two levels only (parent -> children). Parent category rows are
-- inserted first, then children reference parents by slug-resolved id.
-- ==============================================================================

BEGIN;

-- ── Helper: insert-or-get a category by slug ─────────────────────────────
-- Returns the id whether the row pre-existed or was just created.

CREATE OR REPLACE FUNCTION waw_upsert_category(
  p_name TEXT, p_name_urdu TEXT, p_slug TEXT, p_parent_slug TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL, p_sort INTEGER DEFAULT 0,
  p_commission NUMERIC DEFAULT NULL, p_image_url TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id TEXT;
  v_parent_id TEXT := NULL;
BEGIN
  IF p_parent_slug IS NOT NULL THEN
    SELECT id INTO v_parent_id FROM categories WHERE slug = p_parent_slug;
    IF v_parent_id IS NULL THEN
      RAISE EXCEPTION 'Parent category % not found (insert parents first)', p_parent_slug;
    END IF;
  END IF;

  INSERT INTO categories (name, name_urdu, slug, parent_id, description, sort_order, is_active, commission_percentage, image_url)
  VALUES (p_name, p_name_urdu, p_slug, v_parent_id, p_description, p_sort, TRUE, p_commission, p_image_url)
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM categories WHERE slug = p_slug;
    -- Keep commission aligned with this migration's intent on re-run
    UPDATE categories SET
      name_urdu = COALESCE(name_urdu, p_name_urdu),
      parent_id = COALESCE(parent_id, v_parent_id),
      commission_percentage = COALESCE(commission_percentage, p_commission),
      is_active = TRUE
    WHERE slug = p_slug AND is_active = FALSE;
  END IF;

  RETURN v_id;
END;
$$;

-- ── Top-level categories ─────────────────────────────────────────────────

PERFORM waw_upsert_category('Fashion', 'فیشن', 'fashion',
  'Clothing, fabrics and footwear for men, women and kids', 1, 15.00);
PERFORM waw_upsert_category('Mobiles & Technology', 'موبائل اور ٹیکنالوجی', 'mobiles-tech',
  'Phones, tablets, audio and gadgets', 2, 3.00);
PERFORM waw_upsert_category('Beauty & Fragrance', 'بیوٹی اور پرفیوم', 'beauty-fragrance',
  'Skincare, makeup and authentic fragrances', 3, 10.00);
PERFORM waw_upsert_category('Home & Living', 'گھر اور زندگی', 'home-living',
  'Furniture, decor, kitchen and bedding', 4, 10.00);
PERFORM waw_upsert_category('Leather & Heritage Crafts', 'چمڑے کی مصنوعات', 'leather-craft',
  'Sialkot leather goods and Pakistani heritage crafts', 5, 12.00);
PERFORM waw_upsert_category('Sports & Outdoors', 'کھیل اور آؤٹ ڈور', 'sialkot-sports',
  'Sialkot-manufactured sports equipment and gear', 6, 8.00);
PERFORM waw_upsert_category('Groceries & Essentials', 'کریانہ', 'groceries',
  'Daily-use staples and household essentials', 7, 5.00);
PERFORM waw_upsert_category('Kids & Toys', 'بچوں کی اشیاء', 'kids-toys',
  'Toys, games and baby products', 8, 10.00);

-- ── Fashion subcategories ────────────────────────────────────────────────
PERFORM waw_upsert_category('Women''s Lawn & Festive', 'لان اور فیسٹیو', 'womens-lawn-festive', 'fashion',
  'Unstitched and stitched lawn suits, festive collections', 1, 15.00);
PERFORM waw_upsert_category('Men''s Kurtas & Shalwar Kameez', 'مردانہ کرتہ شیں', 'mens-kurta-shalwar', 'fashion',
  'Traditional menswear and festive kurtas', 2, 15.00);
PERFORM waw_upsert_category('Footwear', 'جوتے', 'footwear', 'fashion',
  'Shoes, khussa, chappals and heritage footwear', 3, 15.00);
PERFORM waw_upsert_category('Bags & Accessories', 'بیگز اور ایکسسیسریز', 'bags-accessories', 'fashion',
  'Handbags, purses, belts and fashion accessories', 4, 15.00);
PERFORM waw_upsert_category('Jewellery & Imitation', 'زیورات', 'jewellery', 'fashion',
  'Traditional and modern jewellery', 5, 15.00);

-- ── Mobiles & Technology subcategories ───────────────────────────────────
PERFORM waw_upsert_category('Mobile Phones', 'موبائل فون', 'mobile-phones', 'mobiles-tech',
  'Smartphones and feature phones', 1, 3.00);
PERFORM waw_upsert_category('Audio & Wearables', 'آڈیو اور ویئریبل', 'audio-wearables', 'mobiles-tech',
  'Earbuds, headphones, smartwatches', 2, 3.00);
PERFORM waw_upsert_category('Mobile Accessories', 'موبائل ایکسسیسریز', 'mobile-accessories', 'mobiles-tech',
  'Chargers, cables, cases and covers', 3, 5.00);

-- ── Beauty & Fragrance subcategories ─────────────────────────────────────
PERFORM waw_upsert_category('Skincare', 'اسکن کیئر', 'skincare', 'beauty-fragrance',
  'Cleansers, serums and moisturisers', 1, 10.00);
PERFORM waw_upsert_category('Makeup', 'میک اپ', 'makeup', 'beauty-fragrance',
  'Lipsticks, foundations and cosmetics', 2, 10.00);
PERFORM waw_upsert_category('Fragrances & Attars', 'پرفیوم اور عطر', 'fragrances-attars', 'beauty-fragrance',
  'Perfumes, body sprays and traditional attars', 3, 10.00);

-- ── Home & Living subcategories ──────────────────────────────────────────
PERFORM waw_upsert_category('Bedsheets & Curtains', 'بید شیٹس اور پردے', 'bedsheets-curtains', 'home-living',
  'King, queen and single bedding sets', 1, 10.00);
PERFORM waw_upsert_category('Kitchen & Dining', 'باورچی خانہ', 'kitchen-dining', 'home-living',
  'Cookware, utensils and dinner sets', 2, 10.00);
PERFORM waw_upsert_category('Decor & Lighting', 'سیج سجاوٹ', 'decor-lighting', 'home-living',
  'Wall art, lamps and home accents', 3, 10.00);
PERFORM waw_upsert_category('Chiniot Handicrafts', 'چنیوٹ کی ہنری مصنوعات', 'chiniot-handicrafts', 'home-living',
  'Hand-carved wooden furniture and brass inlay', 4, 10.00);

-- ── Leather & Heritage Crafts subcategories ──────────────────────────────
PERFORM waw_upsert_category('Leather Bags & Wallets', 'چمڑے کے بیگ اور والٹ', 'leather-bags-wallets', 'leather-craft',
  'Sialkot leather jackets, bags and wallets', 1, 12.00);
PERFORM waw_upsert_category('Sports Gloves & Gear', 'اسپورٹس گلوز', 'sports-gloves', 'leather-craft',
  'Sialkot-made sports gloves and protective gear', 2, 12.00);
PERFORM waw_upsert_category('Heritage Textiles', 'روایتی کپڑے', 'heritage-textiles', 'leather-craft',
  'Handloom fabrics and regional crafts', 3, 12.00);

-- ── Sports & Outdoors subcategories ──────────────────────────────────────
PERFORM waw_upsert_category('Cricket', 'کرکٹ', 'cricket', 'sialkot-sports',
  'Bats, balls, pads and cricket gear', 1, 8.00);
PERFORM waw_upsert_category('Football & Futsal', 'فٹبال', 'football-futsal', 'sialkot-sports',
  'Match balls, boots and gear', 2, 8.00);
PERFORM waw_upsert_category('Fitness & Exercise', 'فٹنس', 'fitness-exercise', 'sialkot-sports',
  'Gym equipment and activewear', 3, 8.00);

-- ── Groceries & Essentials subcategories ─────────────────────────────────
PERFORM waw_upsert_category('Staples & Grains', 'غذا', 'staples-grains', 'groceries',
  'Rice, flour, lentils and dry goods', 1, 5.00);
PERFORM waw_upsert_category('Tea & Beverages', 'چائے اور مشروبات', 'tea-beverages', 'groceries',
  'Tea, coffee and drinks', 2, 5.00);
PERFORM waw_upsert_category('Household Essentials', 'گھریلو ضروریات', 'household-essentials', 'groceries',
  'Cleaning supplies and daily essentials', 3, 5.00);

-- ── Kids & Toys subcategories ────────────────────────────────────────────
PERFORM waw_upsert_category('Toys & Games', 'کھلونے', 'toys-games', 'kids-toys',
  'Action figures, dolls and board games', 1, 10.00);
PERFORM waw_upsert_category('Baby Care', 'بچوں کی دیکھ بھال', 'baby-care', 'kids-toys',
  'Diapers, feeding and nursery', 2, 10.00);
PERFORM waw_upsert_category('Kids Clothing', 'بچوں کے کپڑے', 'kids-clothing', 'kids-toys',
  'Boys and girls outfits', 3, 10.00);

DROP FUNCTION waw_upsert_category(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, NUMERIC, TEXT);

-- ── Recursive descendant helper (public, read-only utility) ─────────────
-- Returns the id of every category in the subtree rooted at p_slug (or p_id),
-- inclusive of the root. Public API: buyers filter by a parent category and
-- see all subcategory listings.

CREATE OR REPLACE FUNCTION category_descendant_ids(p_slug TEXT DEFAULT NULL, p_id TEXT DEFAULT NULL)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_root TEXT;
  v_result TEXT[];
BEGIN
  IF p_slug IS NOT NULL THEN
    SELECT id INTO v_root FROM categories WHERE slug = p_slug;
  ELSE
    v_root := p_id;
  END IF;

  IF v_root IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  WITH RECURSIVE tree AS (
    SELECT id FROM categories WHERE id = v_root
    UNION ALL
    SELECT c.id FROM categories c JOIN tree t ON c.parent_id = t.id
  )
  SELECT array_agg(id) INTO v_result FROM tree;

  RETURN v_result;
END;
$$;

COMMIT;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('053_category_taxonomy', NOW())
ON CONFLICT (version) DO NOTHING;
