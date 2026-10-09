import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/core/utils/cn'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
  hidden?: boolean
}

/** Dropdown menu with keyboard navigation (arrows, Escape, Enter). */
export function Menu({
  trigger,
  items,
  align = 'end',
  header,
}: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; 'aria-controls': string }) => ReactNode
  items: MenuItem[]
  align?: 'start' | 'end'
  header?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  const visible = items.filter((i) => !i.hidden)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus())
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'))
    const index = nodes.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? (index + 1) % nodes.length : (index - 1 + nodes.length) % nodes.length
    nodes[next]?.focus()
  }

  return (
    <div ref={root} className="relative inline-flex">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': id })}
      {open && (
        <div
          id={id}
          role="menu"
          onKeyDown={onMenuKeyDown}
          className={cn(
            'absolute top-full z-40 mt-1.5 min-w-52 animate-scale-in overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-pop',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {header && <div className="border-b border-border px-2.5 pt-1.5 pb-2 mb-1">{header}</div>}
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium outline-none transition-colors',
                'disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
                item.danger ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft' : 'text-fg hover:bg-surface-3 focus:bg-surface-3',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
