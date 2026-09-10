-- Migration 048: Complete national serviceable-cities coverage
--
-- Fixes two gaps:
--   1. The base cities (Lahore, Karachi, Islamabad, ...) were only ever
--      seeded by the archived legacy seed, never by the live migration
--      chain. A fresh database therefore had an EMPTY serviceable_cities
--      table: checkout failed the serviceability check for every city and
--      orders.shipping_city (FK -> serviceable_cities.city_name) rejected
--      every insert.
--   2. Coverage was incomplete. This adds all main cities across Punjab,
--      Sindh, KPK, Balochistan, ICT, AJK and Gilgit-Baltistan, including
--      the Jhelum region (Jhelum, Dina, Sohawa, Gujar Khan, Pind Dadan
--      Khan, Kharian, Sarai Alamgir).
--
-- Tier assignments exactly mirror 033_cities_tier_and_delivery_config:
--   tier 1 = Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad
--   tier 2 = Multan, Peshawar, Sialkot, Gujranwala, Hyderabad, Quetta,
--            Abbottabad, Sargodha, Bahawalpur
--   tier 3 = everything else
-- Idempotent upsert: safe on both fresh databases and the existing
-- Supabase project (converges both to the same state).

INSERT INTO serviceable_cities (city_name, province, is_cod_eligible, is_active, supported_couriers, tier) VALUES
  -- Punjab: major metros
  ('Lahore',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 1),
  ('Faisalabad',             'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 1),
  ('Rawalpindi',             'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 1),
  -- Punjab: secondary cities
  ('Multan',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 2),
  ('Sialkot',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 2),
  ('Gujranwala',             'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 2),
  ('Bahawalpur',             'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 2),
  ('Sargodha',               'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 2),
  -- Punjab: main cities
  ('Sahiwal',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Jhang',                  'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Dera Ghazi Khan',        'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Gujrat',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Kasur',                  'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Mianwali',               'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Sheikhupura',            'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Lahore Cantonment',      'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Rawalpindi Cantonment',  'Federal',       true, true, ARRAY['POSTEX','TRAX'], 3),
  -- Punjab: Jhelum region and northern Punjab
  ('Jhelum',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Dina',                   'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Sohawa',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Gujar Khan',             'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Pind Dadan Khan',        'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Kharian',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Sarai Alamgir',          'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Chakwal',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Attock',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Murree',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Wah Cantonment',         'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  -- Punjab: other main districts
  ('Okara',                  'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Vehari',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Khanewal',               'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Rahim Yar Khan',         'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Muzaffargarh',           'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Kot Addu',               'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Layyah',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Bhakkar',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Khushab',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Hafizabad',              'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Nankana Sahib',          'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Narowal',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Mandi Bahauddin',        'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Chiniot',                'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Toba Tek Singh',         'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Pakpattan',              'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Wazirabad',              'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Daska',                  'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Gojra',                  'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Kamoke',                 'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Jaranwala',              'Punjab',        true, true, ARRAY['POSTEX','TRAX'], 3),

  -- Sindh
  ('Karachi',                'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 1),
  ('Hyderabad',              'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 2),
  ('Sukkur',                 'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Larkana',                'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Nawabshah',              'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Mirpur Khas',            'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Jacobabad',              'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Shikarpur',              'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Khairpur',               'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Dadu',                   'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Sanghar',                'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Badin',                  'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Thatta',                 'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Ghotki',                 'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Umerkot',                'Sindh',         true, true, ARRAY['POSTEX','TRAX'], 3),

  -- KPK
  ('Peshawar',               'KPK',           true, true, ARRAY['POSTEX','TRAX'], 2),
  ('Abbottabad',             'KPK',           true, true, ARRAY['POSTEX','TRAX'], 2),
  ('Mardan',                 'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Mingora',                'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Dera Ismail Khan',       'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Nowshera',               'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Kohat',                  'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Charsadda',              'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Swabi',                  'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Bannu',                  'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Haripur',                'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Mansehra',               'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Hangu',                  'KPK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Chitral',                'KPK',           true, true, ARRAY['TRAX','POSTEX'], 3),

  -- Balochistan
  ('Quetta',                 'Balochistan',   true, true, ARRAY['TRAX','POSTEX'], 2),
  ('Turbat',                 'Balochistan',   true, true, ARRAY['TRAX','POSTEX'], 3),
  ('Gwadar',                 'Balochistan',   true, true, ARRAY['TRAX','POSTEX'], 3),
  ('Khuzdar',                'Balochistan',   true, true, ARRAY['TRAX','POSTEX'], 3),
  ('Chaman',                 'Balochistan',   true, true, ARRAY['TRAX','POSTEX'], 3),
  ('Sibi',                   'Balochistan',   true, true, ARRAY['TRAX','POSTEX'], 3),
  ('Hub',                    'Balochistan',   true, true, ARRAY['TRAX','POSTEX'], 3),

  -- Islamabad Capital Territory
  ('Islamabad',              'Federal',       true, true, ARRAY['POSTEX','TRAX'], 1),

  -- Azad Jammu & Kashmir
  ('Mirpur',                 'AJK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Bhimber',                'AJK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Kotli',                  'AJK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Muzaffarabad',           'AJK',           true, true, ARRAY['POSTEX','TRAX'], 3),
  ('Rawalakot',              'AJK',           true, true, ARRAY['POSTEX','TRAX'], 3),

  -- Gilgit-Baltistan
  ('Gilgit',                 'Gilgit-Baltistan', true, true, ARRAY['TRAX','POSTEX'], 3),
  ('Skardu',                 'Gilgit-Baltistan', true, true, ARRAY['TRAX','POSTEX'], 3)

ON CONFLICT (city_name) DO UPDATE SET
  province = EXCLUDED.province,
  is_cod_eligible = EXCLUDED.is_cod_eligible,
  is_active = EXCLUDED.is_active,
  supported_couriers = EXCLUDED.supported_couriers,
  tier = EXCLUDED.tier;

-- Re-apply the tier-based delivery windows from 033 so rows inserted by
-- this migration get the same ETA columns as a database where 033 ran
-- after the cities already existed (idempotent).
UPDATE serviceable_cities SET intra_city_days_min = 1, intra_city_days_max = 2 WHERE tier = 1;
UPDATE serviceable_cities SET inter_tier1_days_min = 2, inter_tier1_days_max = 3 WHERE tier = 1;
UPDATE serviceable_cities SET intra_city_days_min = 2, intra_city_days_max = 3 WHERE tier = 2;
UPDATE serviceable_cities SET inter_tier1_days_min = 3, inter_tier1_days_max = 5 WHERE tier = 2;
UPDATE serviceable_cities SET inter_other_days_min = 4, inter_other_days_max = 6 WHERE tier = 2;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('048_serviceable_cities_complete', NOW())
ON CONFLICT (version) DO NOTHING;
