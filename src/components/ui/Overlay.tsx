import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/core/utils/cn'
import { IconButton } from './Button'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

let openOverlays = 0

/** Escape to close, focus trap, focus restore and body scroll lock for dialogs. */
function useDialogBehaviour(open: boolean, onClose: () => void, panel: RefObject<HTMLDivElement | null>) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    openOverlays += 1
    document.body.style.overflow = 'hidden'

    const frame = requestAnimationFrame(() => {
      const el = panel.current
      if (!el) return
      const target = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el
      target.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      const el = panel.current
      if (!el) return
      if (event.key === 'Escape') {
        // Only the top-most overlay reacts.
        if (el.contains(document.activeElement) || document.activeElement === document.body) {
          event.stopPropagation()
          onCloseRef.current()
        }
      } else if (event.key === 'Tab') {
        const nodes = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      openOverlays -= 1
      if (openOverlays === 0) document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [open, panel])
}

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Prevents closing by backdrop click (e.g. while submitting). */
  dismissible?: boolean
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null)
  useDialogBehaviour(open, () => dismissible && onClose(), panel)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-[#040a08]/55 backdrop-blur-[2px]" onClick={() => dismissible && onClose()} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-pop outline-none sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-fg-muted">{description}</p>}
          </div>
          {dismissible && (
            <IconButton label="Fermer" size="sm" onClick={onClose} className="-mt-1 -mr-2">
              <X className="size-4" />
            </IconButton>
          )}
        </div>
        {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  width?: 'md' | 'lg'
}

export function Drawer({ open, onClose, title, description, children, footer, width = 'md' }: DrawerProps) {
  const panel = useRef<HTMLDivElement>(null)
  useDialogBehaviour(open, onClose, panel)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-[#040a08]/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full animate-slide-in-right flex-col border-l border-border bg-surface shadow-pop outline-none',
          width === 'md' ? 'sm:max-w-md' : 'sm:max-w-xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-fg-muted">{description}</p>}
          </div>
          <IconButton label="Fermer" size="sm" onClick={onClose} className="-mt-1 -mr-2">
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
