import {
  Activity,
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Repeat,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { PermissionRequirement } from '@/core/permissions/permissions'

export const paths = {
  login: '/connexion',
  dashboard: '/',
  analytics: '/analytics',
  businesses: '/entreprises',
  business: (id: string) => `/entreprises/${id}`,
  users: '/utilisateurs',
  user: (id: string) => `/utilisateurs?user=${id}`,
  subscriptions: '/abonnements',
  payments: '/paiements',
  support: '/support',
  ticket: (id: string) => `/support?ticket=${id}`,
  announcements: '/annonces',
  audit: '/audit',
  settings: '/parametres',
} as const

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  permission?: PermissionRequirement
  /** Keyword aliases for the command palette. */
  keywords?: string
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/** Single navigation tree: sidebar, command palette and route guards read it. */
export const NAVIGATION: NavSection[] = [
  {
    label: 'Pilotage',
    items: [
      { label: 'Tableau de bord', to: paths.dashboard, icon: LayoutDashboard, keywords: 'accueil dashboard' },
      { label: 'Analytics', to: paths.analytics, icon: BarChart3, permission: 'analytics.read', keywords: 'mrr arr churn kpi bi' },
    ],
  },
  {
    label: 'Clients',
    items: [
      { label: 'Entreprises', to: paths.businesses, icon: Building2, permission: 'businesses.read', keywords: 'commerces tenants boutiques' },
      { label: 'Utilisateurs', to: paths.users, icon: Users, permission: 'users.read', keywords: 'comptes membres' },
    ],
  },
  {
    label: 'Revenus',
    items: [
      { label: 'Abonnements', to: paths.subscriptions, icon: Repeat, permission: 'subscriptions.read', keywords: 'plans essais renouvellements' },
      { label: 'Paiements', to: paths.payments, icon: CreditCard, permission: 'billing.read', keywords: 'transactions encaissements facturation' },
    ],
  },
  {
    label: 'Relation client',
    items: [
      { label: 'Support', to: paths.support, icon: LifeBuoy, permission: 'support.read', keywords: 'tickets aide' },
      { label: 'Annonces', to: paths.announcements, icon: Megaphone, permission: 'announcements.read', keywords: 'notifications diffusion' },
    ],
  },
  {
    label: 'Sécurité',
    items: [
      { label: 'Journal d’audit', to: paths.audit, icon: ScrollText, permission: 'audit.read', keywords: 'logs historique traces' },
      { label: 'Paramètres', to: paths.settings, icon: Settings, keywords: 'équipe admins profil thème' },
    ],
  },
]

export const ACTIVITY_ICON = Activity

/** Filters the tree by permission; empty sections disappear. */
export function visibleNavigation(can: (p: PermissionRequirement | undefined) => boolean): NavSection[] {
  return NAVIGATION.map((section) => ({ ...section, items: section.items.filter((i) => can(i.permission)) })).filter((s) => s.items.length > 0)
}
