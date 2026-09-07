-- Migration 034: Seed comprehensive marketplace config
-- Replaces ALL hardcoded business rules, phone numbers, URLs, emails
-- Admin can update these via PATCH /api/admin/settings

-- Delivery & Shipping
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('free_delivery_threshold_pkr', '5000', 'Minimum order amount for free delivery'),
  ('default_shipping_fee_pkr', '200', 'Default shipping fee in PKR'),
  ('cod_handling_fee_pkr', '100', 'Cash on Delivery handling fee'),
  ('gst_rate_percentage', '18', 'General Sales Tax rate'),
  ('return_window_days', '7', 'Number of days for return policy'),
  ('payout_settlement_days', '7', 'T+N days for seller payout after delivery'),
  ('dispatch_window_hours', '24', 'Hours allowed for seller to dispatch order'),
  ('heavy_parcel_weight_kg', '5', 'Weight threshold for heavy parcel courier selection')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Contact Information
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('whatsapp_number', '+923001234567', 'WhatsApp contact number'),
  ('support_email', 'support@waw.pk', 'Support email address'),
  ('care_email', 'care@waw.com.pk', 'Customer care email'),
  ('support_phone', '+92 300 1234567', 'Support phone number displayed on invoices')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Site URLs
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('site_url', 'https://waw.com.pk', 'Main website URL'),
  ('site_url_www', 'https://www.waw.com.pk', 'Main website URL with www'),
  ('admin_url', 'https://admin.waw.com.pk', 'Admin portal URL'),
  ('seller_url', 'https://seller.waw.com.pk', 'Seller portal URL'),
  ('facebook_url', 'https://facebook.com/wawpakistan', 'Facebook page URL'),
  ('twitter_url', 'https://twitter.com/wawpakistan', 'Twitter page URL'),
  ('instagram_url', 'https://instagram.com/wawpakistan', 'Instagram page URL'),
  ('linkedin_url', 'https://linkedin.com/company/wawpakistan', 'LinkedIn page URL'),
  ('youtube_url', 'https://youtube.com/@wawpakistan', 'YouTube channel URL')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Business Identity
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('business_name', 'Waw Pakistan', 'Business display name'),
  ('business_name_urdu', 'واو پاکستان', 'Business name in Urdu'),
  ('business_tagline', 'Pakistan''s premium online marketplace', 'Business tagline'),
  ('business_city', 'Lahore', 'Business headquarters city'),
  ('business_country', 'Pakistan', 'Business country'),
  ('currency', 'PKR', 'Default currency'),
  ('currency_symbol', 'Rs', 'Currency symbol'),
  ('default_commission_pct', '10', 'Default seller commission percentage')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Raast Configuration
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('raast_merchant_alias', 'waw.market@hbl', 'Raast merchant alias'),
  ('raast_merchant_name', 'Waw Online Shopping PK', 'Raast merchant display name'),
  ('raast_merchant_city', 'Lahore', 'Raast merchant city')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Default City (for fallbacks only)
INSERT INTO marketplace_settings (key, value, description) VALUES
  ('default_city', 'Lahore', 'Default city for fallbacks and new users')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;
