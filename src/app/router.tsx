/* eslint-disable react-refresh/only-export-components -- route configuration module, not a component module */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import type { PermissionRequirement } from '@/core/permissions/permissions'
import { paths } from '@/core/router/navigation'
import { NotFoundPage, RequirePermission, RequireStaff } from '@/features/auth/guards'

// One chunk per page: nothing heavy is loaded before it is needed.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const AnalyticsPage = lazy(() => import('@/features/analytics/AnalyticsPage'))
const BusinessesPage = lazy(() => import('@/features/businesses/BusinessesPage'))
const BusinessDetailPage = lazy(() => import('@/features/businesses/BusinessDetailPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const SubscriptionsPage = lazy(() => import('@/features/subscriptions/SubscriptionsPage'))
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage'))
const SupportPage = lazy(() => import('@/features/support/SupportPage'))
const AnnouncementsPage = lazy(() => import('@/features/notifications/AnnouncementsPage'))
const AuditPage = lazy(() => import('@/features/audit/AuditPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

function guarded(Page: LazyExoticComponent<ComponentType>, permission?: PermissionRequirement) {
  return permission ? (
    <RequirePermission permission={permission}>
      <Page />
    </RequirePermission>
  ) : (
    <Page />
  )
}

/** Route → permission. Must match the sidebar (src/core/router/navigation.ts). */
export const routes = [
  { path: paths.login, element: <LoginPage /> },
  {
    element: (
      <RequireStaff>
        <AppShell />
      </RequireStaff>
    ),
    children: [
      { index: true, element: guarded(DashboardPage) },
      { path: paths.analytics, element: guarded(AnalyticsPage, 'analytics.read') },
      { path: paths.businesses, element: guarded(BusinessesPage, 'businesses.read') },
      { path: `${paths.businesses}/:businessId`, element: guarded(BusinessDetailPage, 'businesses.read') },
      { path: paths.users, element: guarded(UsersPage, 'users.read') },
      { path: paths.subscriptions, element: guarded(SubscriptionsPage, 'subscriptions.read') },
      { path: paths.payments, element: guarded(PaymentsPage, 'billing.read') },
      { path: paths.support, element: guarded(SupportPage, 'support.read') },
      { path: paths.announcements, element: guarded(AnnouncementsPage, 'announcements.read') },
      { path: paths.audit, element: guarded(AuditPage, 'audit.read') },
      { path: paths.settings, element: guarded(SettingsPage) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function createRouter() {
  return createBrowserRouter(routes)
}
