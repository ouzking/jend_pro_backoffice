import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { ApiError } from '@/core/api/errors'
import type { AuthRepository, AuthUser } from '@/core/auth/auth.repository'
import { AuthProvider } from '@/core/auth/AuthProvider'
import { toPermissionSet, type PlatformAccess, type PlatformPermission } from '@/core/permissions/permissions'

export const STAFF: AuthUser = { id: 'u-staff', email: 'aminata@jendpro.sn', fullName: 'Aminata Diop' }

export function staffAccess(permissions: PlatformPermission[], overrides: Partial<PlatformAccess> = {}): PlatformAccess {
  return {
    role: 'OPERATIONS',
    status: 'ACTIVE',
    permissions: toPermissionSet(permissions),
    mfaPermissions: new Set(),
    mfaEnrolled: false,
    aal: 'aal1',
    ...overrides,
  }
}

/** In-memory AuthRepository: lets tests drive sessions without Supabase. */
export function fakeAuthRepository(initial: { user: AuthUser | null; access?: PlatformAccess | null; accessError?: unknown; recovery?: boolean }) {
  let user = initial.user
  let access = initial.access ?? null
  let accessError = initial.accessError
  const listeners = new Set<(u: AuthUser | null) => void>()
  const repo: AuthRepository & {
    emit: (u: AuthUser | null) => void
    setAccess: (a: PlatformAccess | null, error?: unknown) => void
    signIn: AuthRepository['signIn']
  } = {
    getCurrentUser: async () => user,
    onAuthChange: (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    signIn: async () => {
      user = STAFF
      listeners.forEach((l) => l(user))
    },
    signOut: async () => {
      user = null
      listeners.forEach((l) => l(null))
    },
    requestPasswordReset: async () => undefined,
    consumeRecoveryHint: () => Boolean(initial.recovery),
    updatePassword: async (newPassword) => {
      if (newPassword.length < 8) throw new ApiError('WEAK_PASSWORD', 'validation', 'Mot de passe trop faible.')
    },
    getPlatformAccess: async () => {
      if (accessError) throw accessError
      return access
    },
    // In-memory TOTP: the code "123456" is valid and upgrades the session to aal2.
    listTotpFactors: async () => (access?.mfaEnrolled ? [{ id: 'f1', friendlyName: 'Téléphone', status: 'verified' as const, createdAt: '2026-10-10' }] : []),
    enrollTotp: async () => ({ factorId: 'f1', qrCode: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>', secret: 'JBSWY3DPEHPK3PXP' }),
    verifyTotp: async (_factorId, code) => {
      if (code !== '123456') throw new ApiError('INVALID_MFA_CODE', 'validation', 'Code incorrect ou expiré.')
      if (access) access = { ...access, mfaEnrolled: true, aal: 'aal2' }
    },
    unenrollTotp: async () => {
      if (access) access = { ...access, mfaEnrolled: false }
    },
    emit: (u) => {
      user = u
      listeners.forEach((l) => l(u))
    },
    setAccess: (a, error) => {
      access = a
      accessError = error
    },
  }
  return repo
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } })
}

export function Providers({ repository, client, children }: { repository: AuthRepository; client?: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client ?? createTestQueryClient()}>
      <ToastProvider>
        <AuthProvider repository={repository}>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
