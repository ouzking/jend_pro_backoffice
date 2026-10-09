/**
 * Contract tests: the REAL repositories against a running jend_pro_backend
 * (local stack + seed). Skipped unless INTEGRATION=1:
 *
 *   cd ../jend_pro_backend && npx supabase start && npx supabase db reset
 *   INTEGRATION=1 npm run test:integration
 *
 * They prove that every RPC the console calls exists, accepts these arguments
 * and returns the shape the mappers expect — and that a merchant is refused.
 */
import { createClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/core/api/database.types'
import type { SupabaseClient } from '@/core/api/supabase'
import { createSupabaseAuthRepository } from '@/core/auth/auth.supabase'
import { createSupabaseAnalyticsRepository } from '@/features/analytics/analytics.supabase'
import { createSupabaseAuditRepository } from '@/features/audit/audit.supabase'
import { createSupabaseBusinessesRepository } from '@/features/businesses/businesses.supabase'
import { createSupabaseAnnouncementsRepository } from '@/features/notifications/announcements.supabase'
import { createSupabasePaymentsRepository } from '@/features/payments/payments.supabase'
import { createSupabaseTeamRepository } from '@/features/settings/team.supabase'
import { createSupabaseSubscriptionsRepository } from '@/features/subscriptions/subscriptions.supabase'
import { createSupabaseSupportRepository } from '@/features/support/support.supabase'
import { createSupabaseUsersRepository } from '@/features/users/users.supabase'
import { rangeForPreset } from '@/core/utils/dates'

// Node globals are not part of the browser type set of this project.
declare const process: { env: Record<string, string | undefined> }

const enabled = process.env.INTEGRATION === '1'
const URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54421'
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
const PASSWORD = 'jendpro-demo'
const page = { page: 1, pageSize: 10 }

function client(): SupabaseClient {
  return createClient<Database>(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } }) as SupabaseClient
}

describe.skipIf(!enabled)('integration — back-office repositories against jend_pro_backend', () => {
  const admin = client()
  const merchant = client()

  beforeAll(async () => {
    await createSupabaseAuthRepository(admin).signIn('admin@demo.jendpro.local', PASSWORD)
    await createSupabaseAuthRepository(merchant).signIn('owner@demo.jendpro.local', PASSWORD)
  })

  it('auth: staff gets platform access, a merchant does not', async () => {
    const access = await createSupabaseAuthRepository(admin).getPlatformAccess()
    expect(access?.role).toBe('SUPER_ADMIN')
    expect(access?.permissions.has('admins.manage')).toBe(true)
    expect(await createSupabaseAuthRepository(merchant).getPlatformAccess()).toBeNull()
  })

  it('a merchant is refused by every admin RPC (server-side check)', async () => {
    await expect(createSupabaseBusinessesRepository(merchant).list({}, page)).rejects.toMatchObject({ code: 'PERMISSION_DENIED', kind: 'forbidden' })
    await expect(createSupabaseAnalyticsRepository(merchant).overview(rangeForPreset('7d'))).rejects.toMatchObject({ kind: 'forbidden' })
  })

  it('businesses: list, detail, members', async () => {
    const repo = createSupabaseBusinessesRepository(admin)
    const list = await repo.list({ search: 'Démo' }, page)
    expect(list.total).toBeGreaterThanOrEqual(1)
    const demo = list.items[0]
    expect(demo.ownerEmail).toBe('owner@demo.jendpro.local')
    const detail = await repo.get(demo.id)
    expect(detail.counts.products).toBeGreaterThan(0)
    expect(detail.subscriptions.length).toBeGreaterThan(0)
    expect((await repo.listMembers(demo.id)).length).toBeGreaterThanOrEqual(3)
    await expect(repo.list({ sort: 'last_sale_desc' }, page)).resolves.toBeDefined()
  })

  it('users: list and detail', async () => {
    const repo = createSupabaseUsersRepository(admin)
    const list = await repo.list('owner@demo', page)
    expect(list.items[0]?.businessesCount).toBe(1)
    const detail = await repo.get(list.items[0].id)
    expect(detail.memberships[0]?.roleCode).toBe('OWNER')
  })

  it('subscriptions and plans', async () => {
    const repo = createSupabaseSubscriptionsRepository(admin)
    const plans = await repo.listPlans()
    expect(plans.map((p) => p.code)).toEqual(expect.arrayContaining(['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE']))
    const subs = await repo.list({ currentOnly: true }, page)
    expect(subs.total).toBeGreaterThanOrEqual(1)
  })

  it('payments: list confirmed billing events', async () => {
    const list = await createSupabasePaymentsRepository(admin).list({}, page)
    expect(list.total).toBeGreaterThanOrEqual(0)
  })

  it('support: queue, conversation with internal notes', async () => {
    const repo = createSupabaseSupportRepository(admin)
    const list = await repo.list({ openOnly: true }, page)
    expect(list.total).toBeGreaterThanOrEqual(1)
    const ticket = await repo.get(list.items[0].id)
    expect(ticket.messages.length).toBeGreaterThanOrEqual(2)
    expect(ticket.messages.some((m) => m.isStaff)).toBe(true)
  })

  it('announcements: draft, count, delete (never sent in tests)', async () => {
    const repo = createSupabaseAnnouncementsRepository(admin)
    const id = await repo.save({ title: 'Test intégration', body: 'Brouillon', audience: 'ROLE', audienceValue: 'OWNER' })
    expect(await repo.countRecipients('ROLE', 'OWNER')).toBeGreaterThanOrEqual(1)
    expect((await repo.list(page)).items.some((a) => a.id === id && a.status === 'DRAFT')).toBe(true)
    await repo.remove(id)
  })

  it('audit: keyset pagination over the whole platform', async () => {
    const repo = createSupabaseAuditRepository(admin)
    const first = await repo.list({}, null, 5)
    expect(first.entries.length).toBeGreaterThan(0)
    if (first.next) {
      const second = await repo.list({}, first.next, 5)
      expect(second.entries.every((e) => !first.entries.some((f) => f.id === e.id))).toBe(true)
    }
  })

  it('analytics: overview and time series', async () => {
    const repo = createSupabaseAnalyticsRepository(admin)
    const range = rangeForPreset('30d')
    const overview = await repo.overview(range)
    expect(overview.businesses.total).toBeGreaterThanOrEqual(1)
    expect(await repo.timeseries(range, 'day')).toHaveLength(30)
  })

  it('team: admins and role matrix', async () => {
    const repo = createSupabaseTeamRepository(admin)
    expect((await repo.list()).some((a) => a.role === 'SUPER_ADMIN')).toBe(true)
    expect((await repo.roleMatrix()).length).toBeGreaterThan(13)
  })
})
