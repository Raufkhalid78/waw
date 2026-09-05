-- 017_admin_mfa_table.sql
-- Admin MFA (Multi-Factor Authentication) table for TOTP enrollment

CREATE TABLE IF NOT EXISTS public.admin_mfa (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.admin_mfa ENABLE ROW LEVEL SECURITY;

-- Admins can only manage their own MFA
CREATE POLICY "Admins manage own MFA" ON public.admin_mfa
  FOR ALL USING (auth.uid()::text = user_id OR user_id IN (
    SELECT id FROM profiles WHERE role = 'ADMIN'
  ));

-- Index for fast lookup during login
CREATE INDEX IF NOT EXISTS idx_admin_mfa_user_id ON public.admin_mfa(user_id);
