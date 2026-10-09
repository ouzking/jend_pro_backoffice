import { Link, useNavigate } from 'react-router'
import { Bell, LifeBuoy, LogOut, Menu as MenuIcon, Moon, Search, Settings, Sun } from 'lucide-react'
import { IconButton } from '@/components/ui/Button'
import { Menu } from '@/components/ui/Menu'
import { Kbd } from '@/components/ui/States'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/core/auth'
import { PLATFORM_ROLE, TICKET_PRIORITY } from '@/core/config/domain'
import { paths } from '@/core/router/navigation'
import { formatRelative } from '@/core/utils/format'
import { useTheme } from '@/core/utils/theme'
import { useToast } from '@/components/ui/Toast'
import type { TicketListItem } from '@/features/support/support.repository'

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

export function Topbar({
  onOpenMobileNav,
  onOpenSearch,
  openTickets,
  openTicketsTotal,
}: {
  onOpenMobileNav: () => void
  onOpenSearch: () => void
  openTickets?: TicketListItem[]
  openTicketsTotal?: number
}) {
  const { user, access, signOut, can } = useAuth()
  const [theme, toggleTheme] = useTheme()
  const navigate = useNavigate()
  const toast = useToast()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
      <IconButton label="Ouvrir le menu" className="lg:hidden" onClick={onOpenMobileNav}>
        <MenuIcon className="size-5" />
      </IconButton>

      <button
        type="button"
        onClick={onOpenSearch}
        className="group flex h-9 w-full max-w-md min-w-0 items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-[13px] text-fg-subtle shadow-xs transition-colors hover:border-border-strong hover:text-fg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">
          <span className="sm:hidden">Rechercher…</span>
          <span className="hidden sm:inline">Rechercher entreprises, utilisateurs, tickets…</span>
        </span>
        <span className="hidden items-center gap-0.5 sm:flex">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <IconButton label={theme === 'dark' ? 'Thème clair' : 'Thème sombre'} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </IconButton>

        {can('support.read') && (
          <Menu
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label={`Tickets à traiter${openTicketsTotal ? ` : ${openTicketsTotal}` : ''}`}
                className="relative grid size-9 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <Bell className="size-[18px]" />
                {Boolean(openTicketsTotal) && (
                  <span className="absolute top-1.5 right-1.5 flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-accent ring-2 ring-bg" />
                  </span>
                )}
              </button>
            )}
            header={
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-fg">À traiter</p>
                <Link to={`${paths.support}?open=1`} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  {openTicketsTotal ?? 0} ticket(s) ouvert(s)
                </Link>
              </div>
            }
            items={
              openTickets && openTickets.length > 0
                ? openTickets.map((t) => ({
                    label: `#${t.number} ${t.subject.length > 34 ? `${t.subject.slice(0, 34)}…` : t.subject} · ${TICKET_PRIORITY[t.priority].label} · ${formatRelative(t.lastMessageAt)}`,
                    icon: <LifeBuoy />,
                    onSelect: () => navigate(paths.ticket(t.id)),
                  }))
                : [{ label: 'Aucun ticket en attente 🎉', onSelect: () => navigate(paths.support), icon: <LifeBuoy /> }]
            }
          />
        )}

        <Menu
          trigger={(props) => (
            <button
              type="button"
              {...props}
              className="ml-1 flex items-center gap-2 rounded-xl p-1 pr-1 transition-colors hover:bg-surface-3 sm:pr-2.5"
              aria-label="Mon compte"
            >
              <Avatar name={user?.fullName ?? user?.email} seed={user?.id} size="sm" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-36 truncate text-[13px] font-semibold text-fg">{user?.fullName ?? user?.email}</span>
                <span className="block text-[11px] text-fg-subtle">{access ? PLATFORM_ROLE[access.role].label : ''}</span>
              </span>
            </button>
          )}
          header={
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-fg">{user?.email}</p>
              {access && (
                <Badge tone={PLATFORM_ROLE[access.role].tone} className="mt-1.5">
                  {PLATFORM_ROLE[access.role].label}
                </Badge>
              )}
            </div>
          }
          items={[
            { label: 'Paramètres', icon: <Settings />, onSelect: () => navigate(paths.settings) },
            {
              label: 'Se déconnecter',
              icon: <LogOut />,
              danger: true,
              onSelect: () => {
                signOut().catch((e: unknown) => toast.error(e))
              },
            },
          ]}
        />
      </div>
    </header>
  )
}
