-- Migration 042: Hero banners (CMS-driven homepage hero)
-- The admin banner CRUD (AdminService.createBanner/updateBanner) writes
-- subtitle / image_url / position / starts_at / ends_at columns that the
-- campaigns table historically never had, so any admin banner save would
-- fail. This adds the missing columns and indexes them for the public
-- hero-banners endpoint.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'homepage',
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Existing rows are effective immediately (hero banners without explicit
-- windows must not be excluded by the active-window filter below).
UPDATE campaigns
  SET starts_at = COALESCE(starts_at, created_at, NOW())
  WHERE starts_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_active_hero
  ON campaigns (position, starts_at, ends_at)
  WHERE is_active = true;
