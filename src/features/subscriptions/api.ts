import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { PageRequest } from '@/core/api/paging'
import { supabase } from '@/core/api/supabase'
import type { Plan, SubscriptionFilters, SubscriptionsRepository } from './subscriptions.repository'
import { createSupabaseSubscriptionsRepository } from './subscriptions.supabase'

/** Swap point for V2 (Laravel API). */
export const subscriptionsRepository: SubscriptionsRepository = createSupabaseSubscriptionsRepository(supabase)

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  plans: ['plans'] as const,
  list: (filters: SubscriptionFilters, page: PageRequest) => [...subscriptionKeys.all, 'list', filters, page] as const,
}

/**
 * The plan catalog is DATA (table subscription_plans): every component that
 * needs plans uses this hook — plans are never hard-coded in the UI.
 */
export function usePlans() {
  return useQuery({ queryKey: subscriptionKeys.plans, queryFn: () => subscriptionsRepository.listPlans(), staleTime: 10 * 60_000 })
}

export function usePlanOptions(): Array<{ value: string; label: string }> {
  const { data } = usePlans()
  return (data ?? []).map((p: Plan) => ({ value: p.code, label: p.name }))
}

/** Stable chart color slot per plan (by catalog order, not by popularity). */
export function planColorSlot(plans: readonly Plan[] | undefined, code: string): 0 | 1 | 2 | 3 | 4 {
  const index = (plans ?? []).findIndex((p) => p.code === code)
  return (index < 0 ? 4 : Math.min(index, 4)) as 0 | 1 | 2 | 3 | 4
}

export function useSubscriptions(filters: SubscriptionFilters, page: PageRequest) {
  return useQuery({
    queryKey: subscriptionKeys.list(filters, page),
    queryFn: () => subscriptionsRepository.list(filters, page),
    placeholderData: keepPreviousData,
  })
}
