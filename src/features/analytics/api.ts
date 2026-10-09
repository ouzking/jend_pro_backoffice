import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { supabase } from '@/core/api/supabase'
import type { DateRange, Granularity } from '@/core/utils/dates'
import type { AnalyticsRepository } from './analytics.repository'
import { createSupabaseAnalyticsRepository } from './analytics.supabase'

/** Swap point for V2 (Laravel API). */
export const analyticsRepository: AnalyticsRepository = createSupabaseAnalyticsRepository(supabase)

export function useOverview(range: DateRange, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'overview', range],
    queryFn: () => analyticsRepository.overview(range),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  })
}

export function useTimeseries(range: DateRange, granularity: Granularity, enabled = true) {
  return useQuery({
    queryKey: ['analytics', 'timeseries', range, granularity],
    queryFn: () => analyticsRepository.timeseries(range, granularity),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  })
}
