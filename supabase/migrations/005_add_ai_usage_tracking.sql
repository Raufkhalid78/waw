-- 005: AI Usage Tracking for OpenRouter request limits
-- Tracks daily request count per feature and platform-wide
-- NOTE: user_id is profiles.id (TEXT) — the API passes req.user.id.

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  feature TEXT NOT NULL, -- 'description_generator', 'chatbot', 'recommendations', 'search'
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for daily count queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_day ON ai_usage (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature_day ON ai_usage (feature, created_at);
