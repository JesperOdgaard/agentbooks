import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

// Service role klient — bruges KUN i server actions / API routes
// Bypasser RLS — brug med omtanke
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase admin credentials mangler i miljøvariable')
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
