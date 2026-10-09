import type { User } from '@supabase/supabase-js'
import { ApiError, toApiError, unwrap } from '@/core/api/errors'
import type { SupabaseClient } from '@/core/api/supabase'
import { toPermissionSet } from '@/core/permissions/permissions'
import type { AuthRepository, AuthUser } from './auth.repository'

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null
  const fullName = user.user_metadata?.full_name
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null,
  }
}

export function createSupabaseAuthRepository(client: SupabaseClient): AuthRepository {
  return {
    async getCurrentUser() {
      const { data, error } = await client.auth.getSession()
      if (error) throw toApiError(error)
      return toAuthUser(data.session?.user)
    },

    onAuthChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => listener(toAuthUser(session?.user)))
      return () => data.subscription.unsubscribe()
    },

    async signIn(email, password) {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        if (error.status === 400 || /invalid login/i.test(error.message)) {
          throw new ApiError('INVALID_CREDENTIALS', 'auth', 'E-mail ou mot de passe incorrect.')
        }
        throw toApiError(error)
      }
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      if (error) throw toApiError(error)
    },

    async requestPasswordReset(email, redirectTo) {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throw toApiError(error)
    },

    async getPlatformAccess() {
      const rows = unwrap(await client.rpc('get_my_platform_access'))
      const row = rows?.[0]
      if (!row) return null
      return { role: row.role, status: row.status, permissions: toPermissionSet(row.permissions ?? []) }
    },
  }
}
