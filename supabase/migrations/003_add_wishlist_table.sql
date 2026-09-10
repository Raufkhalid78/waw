-- Wishlist table for user product wishlists
-- NOTE: user_id is profiles.id (TEXT) — the API passes req.user.id
-- (profiles.id), not an auth.users UUID. product_id holds catalog_products.id
-- (the API's product identifiers are catalog product ids).
CREATE TABLE IF NOT EXISTS public.wishlists (
  id TEXT DEFAULT uuid_generate_v4()::TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, product_id)
);

-- RLS policies
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist"
  ON public.wishlists FOR SELECT
  USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can add to own wishlist"
  ON public.wishlists FOR INSERT
  WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can remove from own wishlist"
  ON public.wishlists FOR DELETE
  USING (auth.uid()::TEXT = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON public.wishlists(product_id);
