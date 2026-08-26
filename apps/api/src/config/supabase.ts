import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

// Supabase Admin Client (Service Role with elevated backend database privileges)
export const supabaseAdmin = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Supabase Public / Anon Client (respects Row Level Security RLS)
export const supabasePublic = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
);
