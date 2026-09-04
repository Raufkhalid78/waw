-- Migration: Add order_number auto-generation trigger as safety net
-- This ensures order_number is always populated even if the RPC function doesn't set it

-- Function to generate order numbers: WAW-PK-{timestamp}-{random}
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'WAW-PK-' || 
      TO_CHAR(NOW(), 'YYMMDD') || '-' || 
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for orders table
DROP TRIGGER IF EXISTS trg_generate_order_number ON orders;
CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- Function to generate store order numbers: WAW-SO-{timestamp}-{random}
CREATE OR REPLACE FUNCTION generate_store_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'WAW-SO-' || 
      TO_CHAR(NOW(), 'YYMMDD') || '-' || 
      UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for store_orders table
DROP TRIGGER IF EXISTS trg_generate_store_order_number ON store_orders;
CREATE TRIGGER trg_generate_store_order_number
  BEFORE INSERT ON store_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_store_order_number();
