import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { ENV } from './env.js';

// Supabase Admin Client (Service Role for backend privileges)
export const supabaseAdmin = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Global Prisma Client
export const prisma = new PrismaClient();
