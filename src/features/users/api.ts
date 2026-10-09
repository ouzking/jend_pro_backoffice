import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { PageRequest } from '@/core/api/paging'
import { supabase } from '@/core/api/supabase'
import type { UsersRepository } from './users.repository'
import { createSupabaseUsersRepository } from './users.supabase'

/** Swap point for V2 (Laravel API). */
export const usersRepository: UsersRepository = createSupabaseUsersRepository(supabase)

export const userKeys = {
  all: ['users'] as const,
  list: (search: string | undefined, page: PageRequest) => [...userKeys.all, 'list', search ?? '', page] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
}

export function useUsers(search: string | undefined, page: PageRequest) {
  return useQuery({ queryKey: userKeys.list(search, page), queryFn: () => usersRepository.list(search, page), placeholderData: keepPreviousData })
}

export function useUser(id: string | null) {
  return useQuery({ queryKey: userKeys.detail(id ?? ''), queryFn: () => usersRepository.get(id as string), enabled: Boolean(id) })
}
