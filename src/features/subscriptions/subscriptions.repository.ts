import type { Page, PageRequest } from '@/core/api/paging'
import type { BillingPeriod, BusinessStatus, SubscriptionStatus } from '@/core/config/domain'

/** Plan catalog row (table subscription_plans — managed by backend migrations only). */
export interface Plan {
  id: string
  code: string
  name: string
  description: string | null
  priceAmount: number
  currencyCode: string
  billingPeriod: BillingPeriod
  /** null = unlimited */
  limits: { maxMembers: number | null; maxProducts: number | null; maxLocations: number | null }
  features: Record<string, unknown>
  isPublic: boolean
  sortOrder: number
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus
  planCode?: string
  search?: string
  endingWithinDays?: number
  /** false = whole history (cancelled / expired included) */
  currentOnly?: boolean
}

export interface SubscriptionListItem {
  id: string
  businessId: string
  businessName: string
  businessStatus: BusinessStatus
  planCode: string
  planName: string
  priceAmount: number
  billingPeriod: BillingPeriod
  status: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  endedAt: string | null
  externalReference: string | null
  createdAt: string
}

export interface SubscriptionsRepository {
  listPlans(): Promise<Plan[]>
  list(filters: SubscriptionFilters, page: PageRequest): Promise<Page<SubscriptionListItem>>
}

/** Date the subscription stops being in good standing (trial end or period end). */
export function subscriptionEndDate(s: Pick<SubscriptionListItem, 'status' | 'trialEndsAt' | 'currentPeriodEnd'>): string | null {
  return s.status === 'TRIALING' ? s.trialEndsAt : s.currentPeriodEnd
}

/** Pricing kind derived from catalog data (never from plan codes). */
export type PlanPricing = 'free' | 'paid' | 'quote'

export function planPricing(plan: Pick<Plan, 'priceAmount' | 'isPublic'>): PlanPricing {
  if (plan.priceAmount > 0) return 'paid'
  return plan.isPublic ? 'free' : 'quote'
}
