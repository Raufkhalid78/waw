-- ============================================================================
-- P0-PHASE1-T11: Add parent_return_id foreign key
-- Links seller-level (child) return requests to the overall order (parent)
-- return request for unified state management and analytics.
-- ============================================================================

ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS parent_return_id TEXT REFERENCES return_requests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_return_requests_parent 
  ON return_requests(parent_return_id) 
  WHERE parent_return_id IS NOT NULL;

-- Record migration
INSERT INTO schema_migrations (version, applied_at)
VALUES ('022_return_request_parent_fk', NOW())
ON CONFLICT (version) DO NOTHING;

