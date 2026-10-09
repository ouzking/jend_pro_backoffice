import { describe, expect, it } from 'vitest'
import { relativeDelta } from '@/components/charts/series'
import { mapOverview, type OverviewJson } from './analytics/analytics.supabase'
import { actionLabel, actionTone } from './audit/actions'
import { mapAuditRow } from './audit/audit.supabase'
import { mapBusinessDetail, mapBusinessListRow, type BusinessDetailJson } from './businesses/businesses.supabase'
import { mapPlan } from './subscriptions/subscriptions.supabase'
import { subscriptionEndDate } from './subscriptions/subscriptions.repository'

describe('repository mappers (backend shape → domain)', () => {
  it('maps a business list row, tolerating NULL columns returned by SQL', () => {
    const row = {
      id: 'b1',
      name: 'Boutique Démo',
      city: null,
      country_code: 'SN',
      phone: null,
      email: null,
      status: 'ACTIVE',
      created_at: '2026-10-01T00:00:00Z',
      owner_name: null,
      owner_email: 'owner@demo.sn',
      members_count: 3,
      plan_code: null,
      plan_name: null,
      subscription_status: null,
      trial_ends_at: null,
      current_period_end: null,
      last_sale_at: null,
      total_count: 1,
    } as unknown as Parameters<typeof mapBusinessListRow>[0]
    expect(mapBusinessListRow(row)).toMatchObject({ id: 'b1', city: null, membersCount: 3, planCode: null, ownerEmail: 'owner@demo.sn' })
  })

  it('maps the business detail json', () => {
    const json: BusinessDetailJson = {
      business: {
        id: 'b1',
        name: 'Boutique',
        legal_name: null,
        ninea: null,
        rccm: null,
        phone: null,
        email: null,
        address: null,
        city: 'Dakar',
        country_code: 'SN',
        currency_code: 'XOF',
        timezone: 'Africa/Dakar',
        status: 'ACTIVE',
        created_at: 'x',
        updated_at: 'y',
      },
      counts: { members: 2, invited: 1, locations: 1, products: 8, customers: 3 },
      activity: { sales_count_30d: 3, revenue_30d: 12100, sales_count_total: 3, last_sale_at: null },
      usage: { members: 3, products: 8, locations: 1 },
      is_restricted: false,
      subscriptions: [
        {
          id: 's1',
          plan_code: 'PRO',
          plan_name: 'Pro',
          status: 'TRIALING',
          trial_ends_at: 't',
          current_period_start: 'p',
          current_period_end: null,
          cancel_at_period_end: false,
          ended_at: null,
          external_reference: null,
          created_at: 'c',
        },
      ],
    }
    const detail = mapBusinessDetail(json)
    expect(detail.activity.revenue30d).toBe(12100)
    expect(detail.subscriptions[0]).toMatchObject({ planCode: 'PRO', status: 'TRIALING' })
  })

  it('maps plan limits, null meaning unlimited', () => {
    const plan = mapPlan({
      id: 'p',
      code: 'BUSINESS',
      name: 'Business',
      description: null,
      price_amount: 25000,
      currency_code: 'XOF',
      billing_period: 'MONTHLY',
      limits: { max_members: 30, max_products: null, max_locations: 10 },
      features: {},
      is_public: true,
      sort_order: 4,
      created_at: '',
      updated_at: '',
    })
    expect(plan.limits).toEqual({ maxMembers: 30, maxProducts: null, maxLocations: 10 })
  })

  it('maps the overview metrics without recomputing them', () => {
    const json: OverviewJson = {
      businesses: { total: 10, active: 9, suspended: 1, new: 4, with_sales: 6, new_activated: 2 },
      users: { total: 30, new: 5, signed_in: 12 },
      subscriptions: { by_status: { ACTIVE: 3, TRIALING: 5 }, by_plan: { PRO: 6 }, churned: 1, trial_expired: 2, trials_ending_7d: 1 },
      revenue: { mrr: 30000, arr: 360000, paying_businesses: 3, arpu: 10000, collected: 45000, payments_count: 4 },
      activity: { sales_count: 120, gmv: 900000 },
    }
    const o = mapOverview(json)
    expect(o.revenue).toEqual({ mrr: 30000, arr: 360000, payingBusinesses: 3, arpu: 10000, collected: 45000, paymentsCount: 4 })
    expect(o.businesses.withSales).toBe(6)
    expect(mapOverview({ ...json, revenue: { ...json.revenue, arpu: null } }).revenue.arpu).toBeNull()
  })

  it('maps audit rows and guards non-object metadata', () => {
    const entry = mapAuditRow({
      id: 'a',
      created_at: 'now',
      business_id: null,
      business_name: null,
      action: 'platform_admin.grant',
      resource_type: 'platform_admin',
      resource_id: null,
      actor_id: null,
      actor_name: null,
      actor_email: null,
      actor_role: 'authenticated',
      metadata: [] as unknown as Record<string, never>,
    } as unknown as Parameters<typeof mapAuditRow>[0])
    expect(entry.metadata).toEqual({})
    expect(entry.businessId).toBeNull()
  })
})

describe('domain helpers', () => {
  it('labels audit actions from the backend catalog, with a readable fallback', () => {
    expect(actionLabel('business.status_change')).toBe('Statut de l’entreprise modifié')
    expect(actionLabel('inventory.count')).toBe('Inventaire physique')
    expect(actionLabel('customer.new_thing')).toBe('Clients · new thing')
    expect(actionTone('business.status_change')).toBe('danger')
    expect(actionTone('billing.manual_payment')).toBe('success')
  })

  it('computes deltas only when a base exists', () => {
    expect(relativeDelta(120, 100)).toBeCloseTo(0.2)
    expect(relativeDelta(5, 0)).toBeNull()
    expect(relativeDelta(0, 0)).toBe(0)
    expect(relativeDelta(undefined, 10)).toBeNull()
  })

  it('uses the trial end for trials and the period end otherwise', () => {
    expect(subscriptionEndDate({ status: 'TRIALING', trialEndsAt: 't', currentPeriodEnd: 'p' })).toBe('t')
    expect(subscriptionEndDate({ status: 'ACTIVE', trialEndsAt: 't', currentPeriodEnd: 'p' })).toBe('p')
  })
})
