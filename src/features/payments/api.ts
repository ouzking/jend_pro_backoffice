import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageRequest } from '@/core/api/paging'
import { supabase } from '@/core/api/supabase'
import type { BillingFilters, ManualPaymentInput, PaymentsRepository } from './payments.repository'
import { createSupabasePaymentsRepository } from './payments.supabase'

/** Swap point for V2 (Laravel API). */
export const paymentsRepository: PaymentsRepository = createSupabasePaymentsRepository(supabase)

export const paymentKeys = {
  all: ['payments'] as const,
  list: (filters: BillingFilters, page: PageRequest) => [...paymentKeys.all, 'list', filters, page] as const,
}

export function useBillingEvents(filters: BillingFilters, page: PageRequest) {
  return useQuery({ queryKey: paymentKeys.list(filters, page), queryFn: () => paymentsRepository.list(filters, page), placeholderData: keepPreviousData })
}

export function useRecordManualPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ManualPaymentInput) => paymentsRepository.recordManualPayment(input),
    onSuccess: () => {
      // A payment changes subscriptions, businesses, revenue metrics and the audit trail.
      for (const key of [['payments'], ['subscriptions'], ['businesses'], ['analytics'], ['audit']]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}
