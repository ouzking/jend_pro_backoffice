/* eslint-disable react-refresh/only-export-components -- provider + its hook belong together */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toApiError, type ApiError } from '@/core/api/errors'
import { can, type PermissionRequirement, type PlatformAccess } from '@/core/permissions/permissions'
import type { AuthRepository, AuthUser } from './auth.repository'

/**
 * - `loading`     session / access being resolved
 * - `anonymous`   no session
 * - `forbidden`   signed in, but not (or no longer) active JËND PRO staff
 * - `ready`       signed-in staff with their platform permissions
 * - `error`       access could not be verified (network…): retry possible
 */
export type AuthStatus = 'loading' | 'anonymous' | 'forbidden' | 'ready' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  access: PlatformAccess | null
  error: ApiError | null
  can: (requirement: PermissionRequirement | undefined) => boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  refreshAccess: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Permissions can change at any time (role change, suspension): re-check periodically. */
const ACCESS_REFRESH_MS = 5 * 60_000

export function AuthProvider({ repository, children }: { repository: AuthRepository; children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [access, setAccess] = useState<PlatformAccess | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const currentUserId = useRef<string | null>(null)

  const resolve = useCallback(
    async (nextUser: AuthUser | null) => {
      const changedUser = currentUserId.current !== (nextUser?.id ?? null)
      currentUserId.current = nextUser?.id ?? null
      setUser(nextUser)
      if (changedUser) queryClient.clear() // never show data cached for another account
      if (!nextUser) {
        setAccess(null)
        setError(null)
        setStatus('anonymous')
        return
      }
      try {
        const nextAccess = await repository.getPlatformAccess()
        if (currentUserId.current !== nextUser.id) return // a newer session won the race
        setAccess(nextAccess)
        setError(null)
        setStatus(nextAccess && nextAccess.status === 'ACTIVE' ? 'ready' : 'forbidden')
      } catch (e) {
        if (currentUserId.current !== nextUser.id) return
        setError(toApiError(e))
        setStatus('error')
      }
    },
    [queryClient, repository],
  )

  useEffect(() => {
    let active = true
    repository
      .getCurrentUser()
      .then((u) => {
        if (active) void resolve(u)
      })
      .catch(() => {
        if (active) void resolve(null)
      })
    const unsubscribe = repository.onAuthChange((u) => {
      // Token refreshes re-emit the same user: only react to identity changes.
      if ((u?.id ?? null) !== currentUserId.current) void resolve(u)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [repository, resolve])

  const refreshAccess = useCallback(() => resolve(user), [resolve, user])

  useEffect(() => {
    if (status !== 'ready') return
    const id = window.setInterval(() => void refreshAccess(), ACCESS_REFRESH_MS)
    const onFocus = () => document.visibilityState === 'visible' && void refreshAccess()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [status, refreshAccess])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      access,
      error,
      can: (requirement) => status === 'ready' && can(access, requirement),
      signIn: async (email, password) => {
        await repository.signIn(email, password)
        // onAuthChange resolves the session and the platform access.
      },
      signOut: async () => {
        await repository.signOut()
        await resolve(null)
      },
      requestPasswordReset: (email) => repository.requestPasswordReset(email, `${window.location.origin}/connexion`),
      refreshAccess,
    }),
    [status, user, access, error, repository, resolve, refreshAccess],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
