import { QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/core/api/errors'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Back-office data is operational, not real-time: 30 s fresh, cached 5 min.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const kind = toApiError(error).kind
          // Never retry what cannot succeed.
          if (kind === 'forbidden' || kind === 'auth' || kind === 'not_found' || kind === 'validation') return false
          return failureCount < 2
        },
      },
      mutations: { retry: false },
    },
  })
}
