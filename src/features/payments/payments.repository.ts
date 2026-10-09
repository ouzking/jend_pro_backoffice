import type { Page, PageRequest } from '@/core/api/paging'

/**
 * A subscription payment CONFIRMED by a provider webhook or recorded manually
 * (backend table billing_events). V1 has no pending / failed / refunded state:
 * the UI must not pretend otherwise.
 */
export interface BillingEvent {
  id: string
  provider: string
  eventId: string
  businessId: string
  businessName: string
  planCode: string
  months: number
  amount: number
  processedAt: string
}

export interface BillingFilters {
  search?: string
  provider?: string
  from?: string
  to?: string
}

export interface ManualPaymentInput {
  businessId: string
  planCode: string
  months: number
  amount: number
  reference: string
  note?: string
}

export interface ManualPaymentResult {
  duplicate: boolean
  subscriptionId: string | null
  currentPeriodEnd: string | null
}

export interface PaymentsRepository {
  list(filters: BillingFilters, page: PageRequest): Promise<Page<BillingEvent>>
  recordManualPayment(input: ManualPaymentInput): Promise<ManualPaymentResult>
}
