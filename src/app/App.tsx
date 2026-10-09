import { Suspense, useState } from 'react'
import { RouterProvider } from 'react-router/dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider, authRepository } from '@/core/auth'
import { createQueryClient } from '@/core/query/queryClient'
import { createRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createRouter)

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider repository={authRepository}>
          <Suspense>
            <RouterProvider router={router} />
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
