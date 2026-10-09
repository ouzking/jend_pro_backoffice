/**
 * Single source of the UI vocabulary for backend enums (labels + visual tone).
 * Values come from the generated database types: adding an enum value in a
 * migration makes TypeScript flag every map below until it is labelled.
 * Plans are NOT listed here: they are data (table subscription_plans).
 */
import type { Database } from '@/core/api/database.types'

type Enums = Database['public']['Enums']

export type BusinessStatus = Enums['business_status']
export type SubscriptionStatus = Enums['subscription_status']
export type MemberStatus = Enums['member_status']
export type PlatformRole = Enums['platform_role']
export type PlatformAdminStatus = Enums['platform_admin_status']
export type TicketStatus = Enums['ticket_status']
export type TicketPriority = Enums['ticket_priority']
export type AnnouncementAudience = Enums['announcement_audience']
export type AnnouncementStatus = Enums['announcement_status']
export type BillingPeriod = Enums['billing_period']

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

export interface EnumMeta {
  label: string
  tone: Tone
  description?: string
}

export const BUSINESS_STATUS: Record<BusinessStatus, EnumMeta> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  SUSPENDED: { label: 'Suspendue', tone: 'danger', description: 'Accès coupé pour tous les membres' },
}

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, EnumMeta> = {
  TRIALING: { label: 'Essai', tone: 'info' },
  ACTIVE: { label: 'Actif', tone: 'success' },
  PAST_DUE: { label: 'Impayé', tone: 'warning', description: 'Délai de grâce de 7 jours' },
  CANCELLED: { label: 'Annulé', tone: 'neutral' },
  EXPIRED: { label: 'Expiré', tone: 'danger', description: 'Mode restreint : lecture seule + caisse' },
}

export const MEMBER_STATUS: Record<MemberStatus, EnumMeta> = {
  INVITED: { label: 'Invité', tone: 'info' },
  ACTIVE: { label: 'Actif', tone: 'success' },
  SUSPENDED: { label: 'Suspendu', tone: 'danger' },
}

export const PLATFORM_ROLE: Record<PlatformRole, EnumMeta> = {
  SUPER_ADMIN: { label: 'Super admin', tone: 'accent', description: 'Tous les droits, y compris la gestion de l’équipe' },
  OPERATIONS: { label: 'Opérations', tone: 'brand', description: 'Entreprises, support, annonces, audit' },
  SUPPORT: { label: 'Support', tone: 'info', description: 'Tickets, consultation des comptes' },
  FINANCE: { label: 'Finance', tone: 'success', description: 'Paiements, abonnements, indicateurs' },
  ANALYST: { label: 'Analyste', tone: 'neutral', description: 'Indicateurs en lecture seule' },
}

export const PLATFORM_ADMIN_STATUS: Record<PlatformAdminStatus, EnumMeta> = {
  ACTIVE: { label: 'Actif', tone: 'success' },
  SUSPENDED: { label: 'Suspendu', tone: 'danger' },
}

export const TICKET_STATUS: Record<TicketStatus, EnumMeta> = {
  OPEN: { label: 'Ouvert', tone: 'info' },
  IN_PROGRESS: { label: 'En cours', tone: 'brand' },
  WAITING: { label: 'En attente client', tone: 'warning' },
  RESOLVED: { label: 'Résolu', tone: 'success' },
  CLOSED: { label: 'Fermé', tone: 'neutral' },
}

export const TICKET_PRIORITY: Record<TicketPriority, EnumMeta> = {
  LOW: { label: 'Basse', tone: 'neutral' },
  NORMAL: { label: 'Normale', tone: 'info' },
  HIGH: { label: 'Haute', tone: 'warning' },
  URGENT: { label: 'Urgente', tone: 'danger' },
}

export const ANNOUNCEMENT_AUDIENCE: Record<AnnouncementAudience, EnumMeta> = {
  ALL: { label: 'Tous les utilisateurs', tone: 'brand' },
  PLAN: { label: 'Par plan', tone: 'info' },
  BUSINESS: { label: 'Une entreprise', tone: 'accent' },
  ROLE: { label: 'Par rôle', tone: 'neutral' },
}

export const ANNOUNCEMENT_STATUS: Record<AnnouncementStatus, EnumMeta> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  SENT: { label: 'Envoyée', tone: 'success' },
}

export const BILLING_PERIOD: Record<BillingPeriod, string> = {
  MONTHLY: 'mois',
  YEARLY: 'an',
}

/** System business roles (seeded in jend_pro_backend, table roles). */
export const BUSINESS_ROLE_LABEL: Record<string, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Administrateur',
  MANAGER: 'Gérant',
  CASHIER: 'Caissier',
  STOCK_MANAGER: 'Gestionnaire de stock',
}

export const PAYMENT_PROVIDER_LABEL: Record<string, string> = {
  MANUAL: 'Paiement manuel',
  wave: 'Wave',
  orange_money: 'Orange Money',
}

export function enumOptions<T extends string>(map: Record<T, EnumMeta>): Array<{ value: T; label: string }> {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value].label }))
}
