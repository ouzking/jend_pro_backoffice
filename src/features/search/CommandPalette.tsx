import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Building2, CornerDownLeft, LifeBuoy, Search, User } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { Kbd, Spinner } from '@/components/ui/States'
import { useAuth } from '@/core/auth'
import { BUSINESS_STATUS, TICKET_STATUS } from '@/core/config/domain'
import { paths, visibleNavigation } from '@/core/router/navigation'
import { cn } from '@/core/utils/cn'
import { useDebouncedValue } from '@/core/utils/hooks'
import { businessesRepository } from '@/features/businesses/api'
import { supportRepository } from '@/features/support/api'
import { usersRepository } from '@/features/users/api'

interface PaletteItem {
  id: string
  group: string
  label: string
  hint?: ReactNode
  icon: ReactNode
  to: string
}

const MIN_QUERY = 2
const PER_GROUP = { page: 1, pageSize: 5 }

/**
 * Global search (⌘K / Ctrl+K): navigation + live search of businesses, users
 * and tickets — each source only when the staff member holds its permission.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Mounted only while open: each opening starts with an empty query.
  return open ? <PaletteDialog onClose={onClose} /> : null
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const term = useDebouncedValue(query.trim(), 200)
  const searching = term.length >= MIN_QUERY

  const businesses = useQuery({
    queryKey: ['palette', 'businesses', term],
    queryFn: () => businessesRepository.list({ search: term }, PER_GROUP),
    enabled: searching && can('businesses.read'),
    staleTime: 30_000,
  })
  const users = useQuery({
    queryKey: ['palette', 'users', term],
    queryFn: () => usersRepository.list(term, PER_GROUP),
    enabled: searching && can('users.read'),
    staleTime: 30_000,
  })
  const tickets = useQuery({
    queryKey: ['palette', 'tickets', term],
    queryFn: () => supportRepository.list({ search: term.replace(/^#/, '') }, PER_GROUP),
    enabled: searching && can('support.read'),
    staleTime: 30_000,
  })

  const items = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()
    const nav: PaletteItem[] = visibleNavigation(can)
      .flatMap((s) => s.items)
      .filter((i) => !q || `${i.label} ${i.keywords ?? ''}`.toLowerCase().includes(q))
      .map((i) => ({ id: `nav-${i.to}`, group: 'Navigation', label: i.label, icon: <i.icon className="size-4" />, to: i.to }))

    if (!searching) return nav
    const results: PaletteItem[] = [
      ...(businesses.data?.items ?? []).map((b) => ({
        id: `b-${b.id}`,
        group: 'Entreprises',
        label: b.name,
        hint: (
          <span className="flex items-center gap-2">
            {b.city && <span className="text-fg-subtle">{b.city}</span>}
            <StatusBadge value={b.status} map={BUSINESS_STATUS} />
          </span>
        ),
        icon: <Avatar name={b.name} seed={b.id} size="xs" square />,
        to: paths.business(b.id),
      })),
      ...(users.data?.items ?? []).map((u) => ({
        id: `u-${u.id}`,
        group: 'Utilisateurs',
        label: u.fullName || u.email,
        hint: <span className="text-fg-subtle">{u.email}</span>,
        icon: <Avatar name={u.fullName ?? u.email} seed={u.id} size="xs" />,
        to: paths.user(u.id),
      })),
      ...(tickets.data?.items ?? []).map((t) => ({
        id: `t-${t.id}`,
        group: 'Tickets',
        label: `#${t.number} · ${t.subject}`,
        hint: <StatusBadge value={t.status} map={TICKET_STATUS} />,
        icon: <LifeBuoy className="size-4" />,
        to: paths.ticket(t.id),
      })),
    ]
    return [...results, ...nav]
  }, [query, searching, can, businesses.data, users.data, tickets.data])

  const loading = searching && (businesses.isFetching || users.isFetching || tickets.isFetching)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => input.current?.focus())
    return () => previous?.focus?.()
  }, [])

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (item: PaletteItem | undefined) => {
    if (!item) return
    onClose()
    navigate(item.to)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(items[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-[#040a08]/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
        className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-border bg-surface shadow-pop"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-[18px] shrink-0 text-fg-subtle" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder="Rechercher une entreprise, un utilisateur, un ticket…"
            className="h-14 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
          />
          {loading ? <Spinner className="text-fg-subtle" /> : <Kbd>Échap</Kbd>}
        </div>
        <div ref={list} id="palette-results" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {query.trim().length > 0 && query.trim().length < MIN_QUERY && (
            <p className="px-3 py-2 text-xs text-fg-subtle">Tapez au moins {MIN_QUERY} caractères pour chercher dans les données.</p>
          )}
          {items.length === 0 && loading && (
            <p className="flex items-center justify-center gap-2 px-3 py-10 text-[13px] text-fg-muted">
              <Spinner /> Recherche en cours…
            </p>
          )}
          {items.length === 0 && !loading && <p className="px-3 py-10 text-center text-[13px] text-fg-muted">Aucun résultat pour « {query} »</p>}
          {items.map((item, index) => {
            const header = index === 0 || items[index - 1].group !== item.group ? item.group : null
            return (
              <div key={item.id}>
                {header && <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-fg-subtle uppercase">{header}</p>}
                <button
                  type="button"
                  id={`palette-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors',
                    index === active ? 'bg-brand-50 text-fg dark:bg-brand-500/10' : 'text-fg-muted',
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center text-fg-subtle">{item.icon}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-fg">{item.label}</span>
                  {item.hint && <span className="hidden shrink-0 text-xs sm:block">{item.hint}</span>}
                  {index === active && <ArrowRight className="size-4 shrink-0 text-brand-600" />}
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-border bg-surface-2 px-4 py-2 text-[11px] text-fg-subtle">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>
              <CornerDownLeft className="size-3" />
            </Kbd>{' '}
            ouvrir
          </span>
          <span className="ml-auto hidden items-center gap-3 sm:flex">
            <Building2 className="size-3.5" /> <User className="size-3.5" /> <LifeBuoy className="size-3.5" />
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
