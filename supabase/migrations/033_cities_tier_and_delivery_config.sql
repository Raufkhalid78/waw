-- Migration 033: Add tier column to serviceable_cities for delivery estimation
-- Tier 1 = major metros (fastest delivery), Tier 2 = secondary cities, Tier 3 = remote

ALTER TABLE serviceable_cities
  ADD COLUMN IF NOT EXISTS tier INTEGER NOT NULL DEFAULT 3 CHECK (tier IN (1, 2, 3)),
  ADD COLUMN IF NOT EXISTS intra_city_days_min INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS intra_city_days_max INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS inter_tier1_days_min INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS inter_tier1_days_max INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS inter_other_days_min INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS inter_other_days_max INTEGER NOT NULL DEFAULT 7;

-- Tier 1: Major metros (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad)
UPDATE serviceable_cities SET tier = 1 WHERE city_name IN ('Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad');

-- Tier 2: Secondary cities (Multan, Peshawar, Sialkot, Gujranwala, Hyderabad, Quetta, Abbottabad, Sargodha, Bahawalpur)
UPDATE serviceable_cities SET tier = 2 WHERE city_name IN ('Multan', 'Peshawar', 'Sialkot', 'Gujranwala', 'Hyderabad', 'Quetta', 'Abbottabad', 'Sargodha', 'Bahawalpur');

-- Tier 3: All other cities (default)

-- Faster delivery for Tier 1 intra-city
UPDATE serviceable_cities SET intra_city_days_min = 1, intra_city_days_max = 2 WHERE tier = 1;
UPDATE serviceable_cities SET inter_tier1_days_min = 2, inter_tier1_days_max = 3 WHERE tier = 1;

-- Tier 2 delivery windows
UPDATE serviceable_cities SET intra_city_days_min = 2, intra_city_days_max = 3 WHERE tier = 2;
UPDATE serviceable_cities SET inter_tier1_days_min = 3, inter_tier1_days_max = 5 WHERE tier = 2;
UPDATE serviceable_cities SET inter_other_days_min = 4, inter_other_days_max = 6 WHERE tier = 2;
