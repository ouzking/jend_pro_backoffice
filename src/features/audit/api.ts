import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/core/api/supabase'
import type { AuditCursor, AuditFilters, AuditRepository } from './audit.repository'
import { createSupabaseAuditRepository } from './audit.supabase'

/** Swap point for V2 (Laravel API). */
export const auditRepository: AuditRepository = createSupabaseAuditRepository(supabase)

export function useAuditLog(filters: AuditFilters, options: { limit?: number; enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['audit', filters, options.limit ?? null],
    queryFn: ({ pageParam }) => auditRepository.list(filters, pageParam, options.limit),
    initialPageParam: null as AuditCursor | null,
    getNextPageParam: (last) => last.next,
    enabled: options.enabled ?? true,
  })
}
