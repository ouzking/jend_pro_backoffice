import type { Page, PageRequest } from '@/core/api/paging'
import type { BusinessStatus, MemberStatus, SubscriptionStatus } from '@/core/config/domain'

export type BusinessSort = 'created_at_desc' | 'created_at_asc' | 'name_asc' | 'last_sale_desc'

export interface BusinessListFilters {
  search?: string
  status?: BusinessStatus
  planCode?: string
  subscriptionStatus?: SubscriptionStatus
  createdFrom?: string
  createdTo?: string
  sort?: BusinessSort
}

export interface BusinessListItem {
  id: string
  name: string
  city: string | null
  countryCode: string
  phone: string | null
  email: string | null
  status: BusinessStatus
  createdAt: string
  ownerName: string | null
  ownerEmail: string | null
  membersCount: number
  planCode: string | null
  planName: string | null
  subscriptionStatus: SubscriptionStatus | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  lastSaleAt: string | null
}

export interface BusinessSubscriptionHistoryItem {
  id: string
  planCode: string
  planName: string
  status: SubscriptionStatus
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  endedAt: string | null
  externalReference: string | null
  createdAt: string
}

export interface BusinessDetail {
  id: string
  name: string
  legalName: string | null
  ninea: string | null
  rccm: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  countryCode: string
  currencyCode: string
  timezone: string
  status: BusinessStatus
  createdAt: string
  updatedAt: string
  counts: { members: number; invited: number; locations: number; products: number; customers: number }
  activity: { salesCount30d: number; revenue30d: number; salesCountTotal: number; lastSaleAt: string | null }
  usage: { members: number; products: number; locations: number }
  isRestricted: boolean
  subscriptions: BusinessSubscriptionHistoryItem[]
}

export interface BusinessMember {
  memberId: string
  userId: string
  fullName: string | null
  email: string
  phone: string | null
  roleCode: string
  roleName: string
  status: MemberStatus
  joinedAt: string | null
  createdAt: string
  lastSignInAt: string | null
}

export interface BusinessesRepository {
  list(filters: BusinessListFilters, page: PageRequest): Promise<Page<BusinessListItem>>
  get(id: string): Promise<BusinessDetail>
  listMembers(id: string): Promise<BusinessMember[]>
  /** Suspension cuts every member's access; audited with the reason. */
  setStatus(id: string, status: BusinessStatus, reason: string): Promise<void>
}
