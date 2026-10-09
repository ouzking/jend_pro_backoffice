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
      return {
        role: row.role,
        status: row.status,
        permissions: toPermissionSet(row.permissions ?? []),
        mfaPermissions: toPermissionSet(row.mfa_permissions ?? []),
        mfaEnrolled: Boolean(row.mfa_enrolled),
        aal: row.aal === 'aal2' ? 'aal2' : 'aal1',
      }
    },

    async listTotpFactors() {
      const { data, error } = await client.auth.mfa.listFactors()
      if (error) throw toApiError(error)
      return data.all
        .filter((f) => f.factor_type === 'totp')
        .map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, status: f.status === 'verified' ? 'verified' : 'unverified', createdAt: f.created_at }))
    },

    async enrollTotp(friendlyName) {
      // An abandoned enrollment (QR shown, never verified) would block a new one.
      const { data: list } = await client.auth.mfa.listFactors()
      for (const f of list?.all ?? []) {
        if (f.factor_type === 'totp' && f.status !== 'verified') await client.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName, issuer: 'JËND PRO Console' })
      if (error) throw toApiError(error)
      return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
    },

    async verifyTotp(factorId, code) {
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\s/g, '') })
      if (error) {
        if (/invalid|expired|code/i.test(error.message))
          throw new ApiError('INVALID_MFA_CODE', 'validation', 'Code incorrect ou expiré. Réessayez avec le code affiché maintenant.')
        throw toApiError(error)
      }
    },

    async unenrollTotp(factorId) {
      const { error } = await client.auth.mfa.unenroll({ factorId })
      if (error) throw toApiError(error)
    },
  }
}
