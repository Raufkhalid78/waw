-- Fix product_questions FK: reference catalog_products instead of legacy products table

-- 1. Drop old FK constraint (references products.id)
ALTER TABLE product_questions
  DROP CONSTRAINT IF EXISTS product_questions_product_id_fkey;

-- 2. Add new FK to catalog_products
ALTER TABLE product_questions
  ADD CONSTRAINT product_questions_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES catalog_products(id) ON DELETE CASCADE;

-- 3. Fix RLS policy: sellers can answer questions for their catalog products
DROP POLICY IF EXISTS "Sellers can update questions for their products" ON product_questions;
CREATE POLICY "Sellers can update questions for their products" ON product_questions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM seller_offers so
    JOIN stores s ON so.store_id = s.id
    WHERE so.catalog_product_id = product_questions.product_id
    AND s.owner_id = auth.uid()::TEXT
  )
);
