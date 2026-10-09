import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/core/api/supabase'
import type { PlatformAdminStatus, PlatformRole } from '@/core/config/domain'
import type { TeamRepository } from './team.repository'
import { createSupabaseTeamRepository } from './team.supabase'

/** Swap point for V2 (Laravel API). */
export const teamRepository: TeamRepository = createSupabaseTeamRepository(supabase)

export function useTeam(enabled: boolean) {
  return useQuery({ queryKey: ['team'], queryFn: () => teamRepository.list(), enabled })
}

export function useRoleMatrix() {
  return useQuery({ queryKey: ['team', 'matrix'], queryFn: () => teamRepository.roleMatrix(), staleTime: 10 * 60_000 })
}

export function useGrantRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: PlatformRole }) => teamRepository.grantRole(email, role),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['team'] }),
  })
}

export function useSetAdminStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: PlatformAdminStatus }) => teamRepository.setStatus(userId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team'] })
      void queryClient.invalidateQueries({ queryKey: ['audit'] })
    },
  })
}
