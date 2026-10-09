import { createClient } from '@supabase/supabase-js'
import { env } from '@/core/config/env'
import type { Database } from './database.types'

/**
 * The ONLY Supabase client of the app. Feature code never imports it directly:
 * it goes through repositories (src/features/<domain>/*.supabase.ts) so the
 * data source can be swapped for the Laravel API (V2) without touching pages.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'jendpro.backoffice.auth' },
})

export type SupabaseClient = typeof supabase
