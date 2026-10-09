import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageRequest } from '@/core/api/paging'
import { supabase } from '@/core/api/supabase'
import type { BusinessStatus } from '@/core/config/domain'
import type { BusinessListFilters, BusinessesRepository } from './businesses.repository'
import { createSupabaseBusinessesRepository } from './businesses.supabase'

/** Swap point for V2 (Laravel API). */
export const businessesRepository: BusinessesRepository = createSupabaseBusinessesRepository(supabase)

export const businessKeys = {
  all: ['businesses'] as const,
  list: (filters: BusinessListFilters, page: PageRequest) => [...businessKeys.all, 'list', filters, page] as const,
  detail: (id: string) => [...businessKeys.all, 'detail', id] as const,
  members: (id: string) => [...businessKeys.all, 'members', id] as const,
}

export function useBusinesses(filters: BusinessListFilters, page: PageRequest) {
  return useQuery({
    queryKey: businessKeys.list(filters, page),
    queryFn: () => businessesRepository.list(filters, page),
    placeholderData: keepPreviousData,
  })
}

export function useBusiness(id: string) {
  return useQuery({ queryKey: businessKeys.detail(id), queryFn: () => businessesRepository.get(id) })
}

export function useBusinessMembers(id: string, enabled = true) {
  return useQuery({ queryKey: businessKeys.members(id), queryFn: () => businessesRepository.listMembers(id), enabled })
}

export function useSetBusinessStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: BusinessStatus; reason: string }) => businessesRepository.setStatus(id, status, reason),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: businessKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['audit'] })
      void queryClient.invalidateQueries({ queryKey: businessKeys.detail(id) })
    },
  })
}
