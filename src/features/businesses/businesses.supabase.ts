import type { Database } from '@/core/api/database.types'
import { unwrap } from '@/core/api/errors'
import { toLimitOffset, toPage } from '@/core/api/paging'
import type { SupabaseClient } from '@/core/api/supabase'
import type { BusinessStatus, SubscriptionStatus } from '@/core/config/domain'
import type { BusinessDetail, BusinessesRepository, BusinessListItem, BusinessMember } from './businesses.repository'

type Functions = Database['public']['Functions']
type ListRow = Functions['admin_list_businesses']['Returns'][number]
type MemberRow = Functions['admin_list_business_members']['Returns'][number]

export function mapBusinessListRow(r: ListRow): BusinessListItem {
  return {
    id: r.id,
    name: r.name,
    city: r.city ?? null,
    countryCode: r.country_code,
    phone: r.phone ?? null,
    email: r.email ?? null,
    status: r.status,
    createdAt: r.created_at,
    ownerName: r.owner_name ?? null,
    ownerEmail: r.owner_email ?? null,
    membersCount: Number(r.members_count ?? 0),
    planCode: r.plan_code ?? null,
    planName: r.plan_name ?? null,
    subscriptionStatus: r.subscription_status ?? null,
    trialEndsAt: r.trial_ends_at ?? null,
    currentPeriodEnd: r.current_period_end ?? null,
    lastSaleAt: r.last_sale_at ?? null,
  }
}

/** Shape of admin_get_business (jsonb) — jend_pro_backend 20261009090000_platform_admin.sql. */
export interface BusinessDetailJson {
  business: {
    id: string
    name: string
    legal_name: string | null
    ninea: string | null
    rccm: string | null
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    country_code: string
    currency_code: string
    timezone: string
    status: BusinessStatus
    created_at: string
    updated_at: string
  }
  counts: { members: number; invited: number; locations: number; products: number; customers: number }
  activity: { sales_count_30d: number; revenue_30d: number; sales_count_total: number; last_sale_at: string | null }
  usage: { members: number; products: number; locations: number }
  is_restricted: boolean
  subscriptions: Array<{
    id: string
    plan_code: string
    plan_name: string
    status: SubscriptionStatus
    trial_ends_at: string | null
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    ended_at: string | null
    external_reference: string | null
    created_at: string
  }>
}

export function mapBusinessDetail(json: BusinessDetailJson): BusinessDetail {
  const b = json.business
  return {
    id: b.id,
    name: b.name,
    legalName: b.legal_name,
    ninea: b.ninea,
    rccm: b.rccm,
    phone: b.phone,
    email: b.email,
    address: b.address,
    city: b.city,
    countryCode: b.country_code,
    currencyCode: b.currency_code,
    timezone: b.timezone,
    status: b.status,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    counts: { ...json.counts },
    activity: {
      salesCount30d: Number(json.activity.sales_count_30d),
      revenue30d: Number(json.activity.revenue_30d),
      salesCountTotal: Number(json.activity.sales_count_total),
      lastSaleAt: json.activity.last_sale_at,
    },
    usage: { ...json.usage },
    isRestricted: json.is_restricted,
    subscriptions: (json.subscriptions ?? []).map((s) => ({
      id: s.id,
      planCode: s.plan_code,
      planName: s.plan_name,
      status: s.status,
      trialEndsAt: s.trial_ends_at,
      currentPeriodStart: s.current_period_start,
      currentPeriodEnd: s.current_period_end,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      endedAt: s.ended_at,
      externalReference: s.external_reference,
      createdAt: s.created_at,
    })),
  }
}

function mapMember(r: MemberRow): BusinessMember {
  return {
    memberId: r.member_id,
    userId: r.user_id,
    fullName: r.full_name ?? null,
    email: r.email,
    phone: r.phone ?? null,
    roleCode: r.role_code,
    roleName: r.role_name,
    status: r.status,
    joinedAt: r.joined_at ?? null,
    createdAt: r.created_at,
    lastSignInAt: r.last_sign_in_at ?? null,
  }
}

export function createSupabaseBusinessesRepository(client: SupabaseClient): BusinessesRepository {
  return {
    async list(filters, page) {
      const rows = unwrap(
        await client.rpc('admin_list_businesses', {
          p_search: filters.search || undefined,
          p_status: filters.status,
          p_plan_code: filters.planCode,
          p_subscription_status: filters.subscriptionStatus,
          p_created_from: filters.createdFrom,
          p_created_to: filters.createdTo,
          p_sort: filters.sort ?? 'created_at_desc',
          ...toLimitOffset(page),
        }),
      )
      return toPage(rows, mapBusinessListRow)
    },

    async get(id) {
      const json = unwrap(await client.rpc('admin_get_business', { p_business_id: id }))
      return mapBusinessDetail(json as unknown as BusinessDetailJson)
    },

    async listMembers(id) {
      const rows = unwrap(await client.rpc('admin_list_business_members', { p_business_id: id }))
      return (rows ?? []).map(mapMember)
    },

    async setStatus(id, status, reason) {
      unwrap(await client.rpc('admin_set_business_status', { p_business_id: id, p_status: status, p_reason: reason }))
    },
  }
}
