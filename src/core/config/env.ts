/**
 * Typed, validated access to build-time configuration.
 * Everything prefixed VITE_ is shipped to the browser: only public values belong here
 * (Supabase URL + publishable key). Never the service_role / secret key.
 */
export interface AppEnv {
  supabaseUrl: string
  supabasePublishableKey: string
}

export function readEnv(source: Record<string, string | undefined>): AppEnv {
  const supabaseUrl = source.VITE_SUPABASE_URL?.trim()
  const supabasePublishableKey = source.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('Configuration manquante : VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY doivent être définis (voir .env.example).')
  }
  if (/service_role|sb_secret_/i.test(supabasePublishableKey) || isServiceRoleJwt(supabasePublishableKey)) {
    throw new Error('Clé interdite : la clé service_role / secret ne doit jamais être utilisée dans le back-office.')
  }
  return { supabaseUrl, supabasePublishableKey }
}

/** Legacy JWT keys carry their role in the payload: refuse a service_role key. */
function isServiceRoleJwt(key: string): boolean {
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

export const env: AppEnv = readEnv(import.meta.env as Record<string, string | undefined>)
