import type { Database, Json } from '@/core/api/database.types'
import { unwrap } from '@/core/api/errors'
import { toLimitOffset, toPage } from '@/core/api/paging'
import type { SupabaseClient } from '@/core/api/supabase'
import type { Plan, SubscriptionsRepository } from './subscriptions.repository'

type PlanRow = Database['public']['Tables']['subscription_plans']['Row']

function limitValue(limits: Json, key: string): number | null {
  if (typeof limits !== 'object' || limits === null || Array.isArray(limits)) return null
  const value = (limits as Record<string, Json | undefined>)[key]
  return typeof value === 'number' ? value : null
}

export function mapPlan(row: PlanRow): Plan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    priceAmount: row.price_amount,
    currencyCode: row.currency_code,
    billingPeriod: row.billing_period,
    limits: {
      maxMembers: limitValue(row.limits, 'max_members'),
      maxProducts: limitValue(row.limits, 'max_products'),
      maxLocations: limitValue(row.limits, 'max_locations'),
    },
    features: typeof row.features === 'object' && row.features !== null && !Array.isArray(row.features) ? (row.features as Record<string, unknown>) : {},
    isPublic: row.is_public,
    sortOrder: row.sort_order,
  }
}

export function createSupabaseSubscriptionsRepository(client: SupabaseClient): SubscriptionsRepository {
  return {
    async listPlans() {
      const rows = unwrap(await client.from('subscription_plans').select('*').order('sort_order'))
      return (rows ?? []).map(mapPlan)
    },
    async list(filters, page) {
      const rows = unwrap(
        await client.rpc('admin_list_subscriptions', {
          p_status: filters.status,
          p_plan_code: filters.planCode,
          p_search: filters.search || undefined,
          p_ending_within_days: filters.endingWithinDays,
          p_current_only: filters.currentOnly ?? true,
          ...toLimitOffset(page),
        }),
      )
      return toPage(rows, (r) => ({
        id: r.id,
        businessId: r.business_id,
        businessName: r.business_name,
        businessStatus: r.business_status,
        planCode: r.plan_code,
        planName: r.plan_name,
        priceAmount: Number(r.price_amount),
        billingPeriod: r.billing_period,
        status: r.status,
        trialEndsAt: r.trial_ends_at ?? null,
        currentPeriodStart: r.current_period_start ?? null,
        currentPeriodEnd: r.current_period_end ?? null,
        cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
        endedAt: r.ended_at ?? null,
        externalReference: r.external_reference ?? null,
        createdAt: r.created_at,
      }))
    },
  }
}
