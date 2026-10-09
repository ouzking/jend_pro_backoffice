import { unwrap } from '@/core/api/errors'
import type { SupabaseClient } from '@/core/api/supabase'
import type { SubscriptionStatus } from '@/core/config/domain'
import type { AnalyticsRepository, PlatformOverview } from './analytics.repository'

/** Shape of admin_get_overview (jsonb). */
export interface OverviewJson {
  businesses: { total: number; active: number; suspended: number; new: number; with_sales: number; new_activated: number }
  users: { total: number; new: number; signed_in: number }
  subscriptions: {
    by_status: Partial<Record<SubscriptionStatus, number>>
    by_plan: Record<string, number>
    churned: number
    trial_expired: number
    trials_ending_7d: number
  }
  revenue: { mrr: number; arr: number; paying_businesses: number; arpu: number | null; collected: number; payments_count: number }
  activity: { sales_count: number; gmv: number }
}

const n = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0)

export function mapOverview(j: OverviewJson): PlatformOverview {
  return {
    businesses: {
      total: n(j.businesses.total),
      active: n(j.businesses.active),
      suspended: n(j.businesses.suspended),
      new: n(j.businesses.new),
      withSales: n(j.businesses.with_sales),
      newActivated: n(j.businesses.new_activated),
    },
    users: { total: n(j.users.total), new: n(j.users.new), signedIn: n(j.users.signed_in) },
    subscriptions: {
      byStatus: j.subscriptions.by_status ?? {},
      byPlan: j.subscriptions.by_plan ?? {},
      churned: n(j.subscriptions.churned),
      trialExpired: n(j.subscriptions.trial_expired),
      trialsEnding7d: n(j.subscriptions.trials_ending_7d),
    },
    revenue: {
      mrr: n(j.revenue.mrr),
      arr: n(j.revenue.arr),
      payingBusinesses: n(j.revenue.paying_businesses),
      arpu: j.revenue.arpu === null || j.revenue.arpu === undefined ? null : n(j.revenue.arpu),
      collected: n(j.revenue.collected),
      paymentsCount: n(j.revenue.payments_count),
    },
    activity: { salesCount: n(j.activity.sales_count), gmv: n(j.activity.gmv) },
  }
}

export function createSupabaseAnalyticsRepository(client: SupabaseClient): AnalyticsRepository {
  return {
    async overview(range) {
      const json = unwrap(await client.rpc('admin_get_overview', { p_from: range.from, p_to: range.to }))
      return mapOverview(json as unknown as OverviewJson)
    },
    async timeseries(range, granularity) {
      const rows = unwrap(await client.rpc('admin_get_timeseries', { p_from: range.from, p_to: range.to, p_granularity: granularity }))
      return (rows ?? []).map((r) => ({
        bucket: r.bucket,
        newBusinesses: n(r.new_businesses),
        newUsers: n(r.new_users),
        activeBusinesses: n(r.active_businesses),
        salesCount: n(r.sales_count),
        gmv: n(r.gmv),
        collected: n(r.collected),
        paymentsCount: n(r.payments_count),
      }))
    },
  }
}
