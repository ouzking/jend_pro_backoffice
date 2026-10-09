import { describe, expect, it } from 'vitest'
import { NAVIGATION, paths, visibleNavigation } from '@/core/router/navigation'
import { routes } from '@/app/router'
import { can, toPermissionSet, type PlatformAccess, type PlatformPermission } from './permissions'

function access(perms: PlatformPermission[], status: PlatformAccess['status'] = 'ACTIVE'): PlatformAccess {
  return { role: 'SUPPORT', status, permissions: toPermissionSet(perms) }
}

describe('can', () => {
  it('requires the permission', () => {
    expect(can(access(['support.read']), 'support.read')).toBe(true)
    expect(can(access(['support.read']), 'billing.manage')).toBe(false)
  })

  it('treats arrays as "any of"', () => {
    expect(can(access(['billing.read']), ['analytics.read', 'billing.read'])).toBe(true)
    expect(can(access([]), ['analytics.read', 'billing.read'])).toBe(false)
  })

  it('denies everything to a suspended or missing staff member', () => {
    expect(can(access(['support.read'], 'SUSPENDED'), 'support.read')).toBe(false)
    expect(can(null, 'support.read')).toBe(false)
  })

  it('allows unguarded items', () => {
    expect(can(null, undefined)).toBe(true)
  })

  it('ignores unknown permission codes sent by a newer backend', () => {
    expect([...toPermissionSet(['support.read', 'teleport.anywhere'])]).toEqual(['support.read'])
  })
})

describe('navigation', () => {
  it('shows a SUPPORT agent only what the role grants', () => {
    const support = access(['businesses.read', 'users.read', 'subscriptions.read', 'support.read', 'support.manage', 'announcements.read'])
    const labels = visibleNavigation((p) => can(support, p)).flatMap((s) => s.items.map((i) => i.label))
    expect(labels).toContain('Support')
    expect(labels).toContain('Entreprises')
    expect(labels).not.toContain('Analytics')
    expect(labels).not.toContain('Paiements')
    expect(labels).not.toContain('Journal d’audit')
  })

  it('removes empty sections', () => {
    const sections = visibleNavigation(() => false)
    expect(sections.every((s) => s.items.length > 0)).toBe(true)
  })

  it('guards every protected route with the same permission as its menu item', () => {
    const shell = routes.find((r) => 'children' in r && r.children)
    const children = (shell as { children: Array<{ path?: string; index?: boolean; element: { props: { permission?: unknown } } }> }).children
    for (const item of NAVIGATION.flatMap((s) => s.items)) {
      const route = item.to === paths.dashboard ? children.find((c) => c.index) : children.find((c) => c.path === item.to)
      expect(route, `route for ${item.to}`).toBeDefined()
      expect(route?.element.props.permission).toEqual(item.permission)
    }
  })
})
