import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageRequest } from '@/core/api/paging'
import { supabase } from '@/core/api/supabase'
import type { SupportRepository, TicketFilters, TicketUpdate } from './support.repository'
import { createSupabaseSupportRepository } from './support.supabase'

/** Swap point for V2 (Laravel API). */
export const supportRepository: SupportRepository = createSupabaseSupportRepository(supabase)

export const supportKeys = {
  all: ['support'] as const,
  list: (filters: TicketFilters, page: PageRequest) => [...supportKeys.all, 'list', filters, page] as const,
  detail: (id: string) => [...supportKeys.all, 'detail', id] as const,
}

export function useTickets(filters: TicketFilters, page: PageRequest, options: { enabled?: boolean; refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: supportKeys.list(filters, page),
    queryFn: () => supportRepository.list(filters, page),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useTicket(id: string | null) {
  return useQuery({ queryKey: supportKeys.detail(id ?? ''), queryFn: () => supportRepository.get(id as string), enabled: Boolean(id) })
}

export function useReplyTicket(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, internal }: { body: string; internal: boolean }) => supportRepository.reply(id, body, internal),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: supportKeys.all }),
  })
}

export function useUpdateTicket(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (update: TicketUpdate) => supportRepository.update(id, update),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: supportKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['audit'] })
    },
  })
}
