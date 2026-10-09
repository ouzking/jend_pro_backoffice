import { unwrap } from '@/core/api/errors'
import { toLimitOffset, toPage } from '@/core/api/paging'
import type { SupabaseClient } from '@/core/api/supabase'
import type { PaymentsRepository } from './payments.repository'

export function createSupabasePaymentsRepository(client: SupabaseClient): PaymentsRepository {
  return {
    async list(filters, page) {
      const rows = unwrap(
        await client.rpc('admin_list_billing_events', {
          p_search: filters.search || undefined,
          p_provider: filters.provider,
          p_from: filters.from,
          p_to: filters.to,
          ...toLimitOffset(page),
        }),
      )
      return toPage(rows, (r) => ({
        id: r.id,
        provider: r.provider,
        eventId: r.event_id,
        businessId: r.business_id,
        businessName: r.business_name,
        planCode: r.plan_code,
        months: Number(r.months),
        amount: Number(r.amount),
        processedAt: r.processed_at,
      }))
    },

    async recordManualPayment(input) {
      const json = unwrap(
        await client.rpc('admin_record_manual_payment', {
          p_business_id: input.businessId,
          p_plan_code: input.planCode,
          p_months: input.months,
          p_amount: input.amount,
          p_reference: input.reference,
          p_note: input.note || undefined,
        }),
      ) as { duplicate?: boolean; subscription_id?: string | null; current_period_end?: string | null } | null
      return {
        duplicate: Boolean(json?.duplicate),
        subscriptionId: json?.subscription_id ?? null,
        currentPeriodEnd: json?.current_period_end ?? null,
      }
    },
  }
}
