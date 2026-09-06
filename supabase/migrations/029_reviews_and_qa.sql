-- Phase C: Trust, Safety & Reviews (P0 & P1)

-- 1. Add seller reply capabilities to reviews
ALTER TABLE reviews 
  ADD COLUMN IF NOT EXISTS seller_reply TEXT,
  ADD COLUMN IF NOT EXISTS seller_reply_at TIMESTAMPTZ;

-- 2. Create Product Q&A Module
CREATE TABLE IF NOT EXISTS product_questions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for product_questions
ALTER TABLE product_questions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'product_questions' AND policyname = 'Anyone can read product_questions'
  ) THEN
    CREATE POLICY "Anyone can read product_questions" ON product_questions FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'product_questions' AND policyname = 'Users can insert their own questions'
  ) THEN
    CREATE POLICY "Users can insert their own questions" ON product_questions FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'product_questions' AND policyname = 'Sellers can update questions for their products'
  ) THEN
    CREATE POLICY "Sellers can update questions for their products" ON product_questions FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM products 
        WHERE products.id = product_questions.product_id 
        AND products.store_id IN (
          SELECT store_id FROM seller_profiles WHERE id = auth.uid()::TEXT
        )
      )
    );
  END IF;
END
$$;

-- Function to check if a user has purchased a product and it was delivered
CREATE OR REPLACE FUNCTION is_verified_purchase(p_user_id TEXT, p_product_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count
  FROM order_items oi
  JOIN store_orders so ON oi.store_order_id = so.id
  JOIN orders o ON so.order_id = o.id
  WHERE o.buyer_id = p_user_id
    AND oi.product_id = p_product_id
    AND so.status = 'DELIVERED';
    
  RETURN v_count > 0;
END;
$$;

-- Trigger to recalculate product rating when a review is added/updated
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE products
    SET rating = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE product_id = NEW.product_id),
        reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE products
    SET rating = (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM reviews WHERE product_id = OLD.product_id),
        reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = OLD.product_id)
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_product_rating ON reviews;
CREATE TRIGGER trigger_update_product_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();
