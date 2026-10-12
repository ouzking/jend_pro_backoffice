import type { PlatformAccess } from '@/core/permissions/permissions'

export interface MfaFactor {
  id: string
  friendlyName: string | null
  status: 'verified' | 'unverified'
  createdAt: string
}

export interface TotpEnrollment {
  factorId: string
  /** SVG image (data URL) to scan with Google Authenticator, Authy… */
  qrCode: string
  /** Manual entry fallback. */
  secret: string
}

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
  /**
   * Subscribes to sign-in / sign-out / token refresh. Returns an unsubscribe function.
   * `recovery` = the session comes from a password-reset link: a new password must be chosen.
   */
  onAuthChange(listener: (user: AuthUser | null, event?: { recovery: boolean }) => void): () => void
  /** True once if the page was opened from a password-reset link (before the SDK cleans the URL). */
  consumeRecoveryHint(): boolean
  updatePassword(newPassword: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  requestPasswordReset(email: string, redirectTo: string): Promise<void>
  /** null when the account is not JËND PRO staff. */
  getPlatformAccess(): Promise<PlatformAccess | null>

  // Second factor (TOTP). The server enforces it; these only drive the flow.
  listTotpFactors(): Promise<MfaFactor[]>
  /** Starts an enrollment (removes abandoned unverified factors first). */
  enrollTotp(friendlyName: string): Promise<TotpEnrollment>
  /** Challenge + verify: upgrades the session to aal2. */
  verifyTotp(factorId: string, code: string): Promise<void>
  unenrollTotp(factorId: string): Promise<void>
}
