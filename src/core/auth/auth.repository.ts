import type { PlatformAccess } from '@/core/permissions/permissions'

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
}

/**
 * Authentication + back-office authorization contract.
 * V1: Supabase Auth + RPC get_my_platform_access. V2: Laravel (Sanctum) —
 * only a new implementation of this interface is needed.
 */
export interface AuthRepository {
  getCurrentUser(): Promise<AuthUser | null>
  /** Subscribes to sign-in / sign-out / token refresh. Returns an unsubscribe function. */
  onAuthChange(listener: (user: AuthUser | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestPasswordReset(email: string, redirectTo: string): Promise<void>
  /** null when the account is not JËND PRO staff. */
  getPlatformAccess(): Promise<PlatformAccess | null>
}
