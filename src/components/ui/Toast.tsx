/* eslint-disable react-refresh/only-export-components -- provider + its hook belong together */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { toApiError } from '@/core/api/errors'
import { cn } from '@/core/utils/cn'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastApi {
  success: (title: string, description?: string) => void
  error: (titleOrError: unknown, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="size-4.5 text-success" />,
  error: <XCircle className="size-4.5 text-danger" />,
  info: <Info className="size-4.5 text-info" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-3), { id, tone, title, description }])
      window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push('success', title, description),
      info: (title, description) => push('info', title, description),
      error: (titleOrError, description) => {
        if (typeof titleOrError === 'string') push('error', titleOrError, description)
        else push('error', 'Action impossible', toApiError(titleOrError).message)
      },
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={cn('pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-pop')}
            >
              <span className="mt-px">{ICONS[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-fg-muted">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="text-fg-subtle hover:text-fg" aria-label="Fermer la notification">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
