-- Migration 030: Expand serviceable cities to cover all major Pakistani urban centers
-- Adds ~30 additional cities across all 4 provinces + ICT

INSERT INTO serviceable_cities (city_name, province, is_cod_eligible, is_active, supported_couriers) VALUES
  -- Punjab (existing: Lahore, Rawalpindi, Faisalabad, Multan, Sialkot, Gujranwala)
  ('Bahawalpur',    'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Sahiwal',       'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Sargodha',      'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Jhang',         'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Dera Ghazi Khan','Punjab',       true, true, ARRAY['POSTEX', 'TRAX']),
  ('Gujrat',        'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Kasur',         'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Mianwali',      'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Sheikhupura',   'Punjab',        true, true, ARRAY['POSTEX', 'TRAX']),
  ('Lahore Cantonment','Punjab',     true, true, ARRAY['POSTEX', 'TRAX']),

  -- Sindh (existing: Karachi, Hyderabad)
  ('Sukkur',        'Sindh',         true, true, ARRAY['POSTEX', 'TRAX']),
  ('Larkana',       'Sindh',         true, true, ARRAY['POSTEX', 'TRAX']),
  ('Nawabshah',     'Sindh',         true, true, ARRAY['POSTEX', 'TRAX']),
  ('Mirpur Khas',   'Sindh',         true, true, ARRAY['POSTEX', 'TRAX']),
  ('Jacobabad',     'Sindh',         true, true, ARRAY['POSTEX', 'TRAX']),

  -- KPK (existing: Peshawar)
  ('Abbottabad',    'KPK',           true, true, ARRAY['POSTEX', 'TRAX']),
  ('Mardan',        'KPK',           true, true, ARRAY['POSTEX', 'TRAX']),
  ('Mingora',       'KPK',           true, true, ARRAY['POSTEX', 'TRAX']),
  ('Dera Ismail Khan','KPK',         true, true, ARRAY['POSTEX', 'TRAX']),
  ('Nowshera',      'KPK',           true, true, ARRAY['POSTEX', 'TRAX']),
  ('Kohat',         'KPK',           true, true, ARRAY['POSTEX', 'TRAX']),

  -- Balochistan (existing: Quetta)
  ('Turbat',        'Balochistan',   true, true, ARRAY['TRAX', 'POSTEX']),
  ('Gwadar',        'Balochistan',   true, true, ARRAY['TRAX', 'POSTEX']),
  ('Khuzdar',       'Balochistan',   true, true, ARRAY['TRAX', 'POSTEX']),

  -- Islamabad Capital Territory (existing: Islamabad)
  ('Rawalpindi Cantonment','Federal', true, true, ARRAY['POSTEX', 'TRAX'])

ON CONFLICT (city_name) DO UPDATE SET
  province = EXCLUDED.province,
  is_cod_eligible = EXCLUDED.is_cod_eligible,
  is_active = EXCLUDED.is_active,
  supported_couriers = EXCLUDED.supported_couriers;
