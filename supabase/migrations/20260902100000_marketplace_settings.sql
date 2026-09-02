-- Marketplace settings table for admin configuration
CREATE TABLE IF NOT EXISTS marketplace_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT REFERENCES profiles(id) ON DELETE SET NULL
);

-- Seed default settings
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

-- RLS: only admins can read/write
ALTER TABLE marketplace_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can read settings"
    ON marketplace_settings FOR SELECT
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update settings"
    ON marketplace_settings FOR UPDATE
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can insert settings"
    ON marketplace_settings FOR INSERT
    WITH CHECK (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'ADMIN')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE ON marketplace_settings TO authenticated;
GRANT ALL ON marketplace_settings TO service_role;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_marketplace_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON marketplace_settings;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON marketplace_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_settings_updated_at();
