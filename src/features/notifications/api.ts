import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageRequest } from '@/core/api/paging'
import { supabase } from '@/core/api/supabase'
import type { AnnouncementAudience } from '@/core/config/domain'
import type { AnnouncementDraft, AnnouncementsRepository } from './announcements.repository'
import { createSupabaseAnnouncementsRepository } from './announcements.supabase'

/** Swap point for V2 (Laravel API). */
export const announcementsRepository: AnnouncementsRepository = createSupabaseAnnouncementsRepository(supabase)

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (page: PageRequest) => [...announcementKeys.all, 'list', page] as const,
  recipients: (audience: AnnouncementAudience, value: string | null | undefined) => [...announcementKeys.all, 'recipients', audience, value ?? ''] as const,
}

export function useAnnouncements(page: PageRequest) {
  return useQuery({ queryKey: announcementKeys.list(page), queryFn: () => announcementsRepository.list(page), placeholderData: keepPreviousData })
}

export function useRecipientCount(audience: AnnouncementAudience, value: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: announcementKeys.recipients(audience, value),
    queryFn: () => announcementsRepository.countRecipients(audience, value),
    enabled,
    retry: false,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: announcementKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['audit'] })
  }
}

export function useSaveAnnouncement() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (draft: AnnouncementDraft) => announcementsRepository.save(draft), onSuccess: invalidate })
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => announcementsRepository.remove(id), onSuccess: invalidate })
}

export function useSendAnnouncement() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => announcementsRepository.send(id), onSuccess: invalidate })
}
