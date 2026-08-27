const fs = require('fs');

const content = `
-- ============================================================
-- PHASE 3: DYNAMIC CONFIGURATION & CONTENT
-- ============================================================

-- 22. Delivery Cities / Serviceability Locations
CREATE TABLE IF NOT EXISTS serviceability_locations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  city_name TEXT UNIQUE NOT NULL,
  city_name_urdu TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  courier_partners TEXT[] NOT NULL DEFAULT '{}',
  estimated_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 23. Popular Searches / Suggestions
CREATE TABLE IF NOT EXISTS search_suggestions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  term TEXT UNIQUE NOT NULL,
  term_urdu TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 24. Promotional Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  tag TEXT,
  title TEXT NOT NULL,
  title_urdu TEXT,
  banner_url TEXT,
  link_url TEXT,
  link_text TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'PROMO_STRIP', -- e.g., TOP_BANNER, PROMO_STRIP, SHORTCUT_LINK
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Initial seed for configuration
INSERT INTO serviceability_locations (city_name, is_active) VALUES
('Lahore', true), ('Karachi', true), ('Islamabad', true), ('Rawalpindi', true),
('Faisalabad', true), ('Peshawar', true), ('Multan', true), ('Sialkot', true),
('Gujranwala', true), ('Quetta', true) ON CONFLICT (city_name) DO NOTHING;

INSERT INTO search_suggestions (term, score, is_active) VALUES
('Khaadi Lawn 2026', 100, true),
('AirPods Pro ANC', 90, true),
('Pure Leather Wallet', 85, true),
('Peshawari Chappal', 80, true),
('Amoled Smart Watch', 75, true),
('Sialkot Match Football', 70, true),
('Royal Oud Attar', 65, true) ON CONFLICT (term) DO NOTHING;

-- Since campaign doesn't have unique constraint on tag or title, we just insert them directly
-- To make this idempotent, we could clear old ones, but for seed we will just delete existing seeds.
DELETE FROM campaigns WHERE campaign_type = 'PROMO_STRIP';

INSERT INTO campaigns (tag, title, link_url, link_text, campaign_type, sort_order) VALUES
('⚡ MEGA DEALS', 'Azadi Celebration: Up to 50% OFF with voucher AZADI2026 at checkout!', '/category/mobiles-tech', 'Shop Deals', 'PROMO_STRIP', 1),
('🚚 FREE DELIVERY', 'Zero shipping charges on all orders above PKR 5,000 nationwide across Pakistan.', '/cart', 'Learn More', 'PROMO_STRIP', 2),
('🛡️ SECURE CHECKOUT', '100% Safe Prepayments & 7-Day Hassle-Free Returns with Escrow Buyer Protection.', '/buyer-protection', 'View Guarantee', 'PROMO_STRIP', 3),
('🏪 SELL ON WAW', '0% Listing Fees & Nationwide PostEx Pickups for verified Pakistani merchants.', '/sell', 'Register Store', 'PROMO_STRIP', 4);

ALTER TABLE serviceability_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Serviceability readable by all" ON serviceability_locations;
CREATE POLICY "Serviceability readable by all" ON serviceability_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Search suggestions readable by all" ON search_suggestions;
CREATE POLICY "Search suggestions readable by all" ON search_suggestions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Campaigns readable by all" ON campaigns;
CREATE POLICY "Campaigns readable by all" ON campaigns FOR SELECT USING (true);
`;

fs.appendFileSync('apps/api/src/database/schema.sql', content, 'utf8');
