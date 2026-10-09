import type { SubscriptionStatus } from '@/core/config/domain'
import type { DateRange, Granularity } from '@/core/utils/dates'

/**
 * Platform metrics as DEFINED by the backend (jend_pro_backend
 * docs/business-rules.md §14). The UI never recomputes them from lists.
 */
export interface PlatformOverview {
  businesses: { total: number; active: number; suspended: number; new: number; withSales: number; newActivated: number }
  users: { total: number; new: number; signedIn: number }
  subscriptions: {
    byStatus: Partial<Record<SubscriptionStatus, number>>
    byPlan: Record<string, number>
    churned: number
    trialExpired: number
    trialsEnding7d: number
  }
  revenue: { mrr: number; arr: number; payingBusinesses: number; arpu: number | null; collected: number; paymentsCount: number }
  activity: { salesCount: number; gmv: number }
}

export interface TimeseriesPoint {
  bucket: string
  newBusinesses: number
  newUsers: number
  activeBusinesses: number
  salesCount: number
  gmv: number
  collected: number
  paymentsCount: number
}

export interface AnalyticsRepository {
  overview(range: DateRange): Promise<PlatformOverview>
  timeseries(range: DateRange, granularity: Granularity): Promise<TimeseriesPoint[]>
}

/** Ratio helpers on backend-provided counts (display only). */
export function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null
}
