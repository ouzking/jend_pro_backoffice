import { NavLink } from 'react-router'
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react'
import { useAuth } from '@/core/auth'
import { PLATFORM_ROLE } from '@/core/config/domain'
import { paths, visibleNavigation } from '@/core/router/navigation'
import { cn } from '@/core/utils/cn'
import { Avatar } from '@/components/ui/Avatar'
import { Logo } from './Logo'

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  badges,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
  /** Live counters next to items (e.g. open tickets). */
  badges?: Partial<Record<string, number>>
}) {
  const { can, user, access } = useAuth()
  const sections = visibleNavigation(can)

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 animate-fade-in bg-[#040a08]/60 lg:hidden" onClick={onCloseMobile} aria-hidden />}
      <aside
        aria-label="Navigation principale"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-fg transition-[width,transform] duration-200 ease-out',
          'bg-[radial-gradient(120%_60%_at_0%_0%,rgb(34_138_95/0.24),transparent_60%)]',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          'w-72 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center border-b border-sidebar-border', collapsed ? 'lg:justify-center lg:px-0' : '', 'px-5')}>
          <Logo collapsed={collapsed} />
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto rounded-md p-1.5 text-sidebar-muted hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.label} className="mb-5 last:mb-0">
              <p
                className={cn(
                  'mb-1.5 px-3 text-[10px] font-bold tracking-[0.14em] text-sidebar-muted/80 uppercase',
                  collapsed && 'lg:invisible lg:h-0 lg:mb-0',
                )}
              >
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const badge = badges?.[item.to]
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === paths.dashboard}
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150',
                            collapsed && 'lg:justify-center lg:px-0',
                            isActive
                              ? 'bg-gradient-to-r from-brand-500/25 to-brand-500/5 text-white shadow-[inset_0_0_0_1px_rgb(143_227_194/0.14)]'
                              : 'text-sidebar-fg/80 hover:bg-white/[0.04] hover:text-white',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span
                                className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-mint shadow-[0_0_12px_rgb(143_227_194/0.85)]"
                                aria-hidden
                              />
                            )}
                            <item.icon className={cn('size-[18px] shrink-0', isActive ? 'text-mint' : 'text-sidebar-muted group-hover:text-sidebar-fg')} />
                            <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                            {badge ? (
                              <span
                                className={cn(
                                  'ml-auto rounded-full bg-mint px-1.5 py-px text-[10px] font-bold text-[#062118] tabular',
                                  collapsed && 'lg:absolute lg:top-0.5 lg:right-1.5 lg:ml-0',
                                )}
                              >
                                {badge > 99 ? '99+' : badge}
                              </span>
                            ) : null}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5', collapsed && 'lg:justify-center lg:px-0')}>
            <Avatar name={user?.fullName ?? user?.email} seed={user?.id} size="sm" />
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
              <p className="truncate text-[13px] font-semibold text-white">{user?.fullName ?? user?.email}</p>
              <p className="truncate text-[11px] text-sidebar-muted">{access ? PLATFORM_ROLE[access.role].label : ''}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="mt-1 hidden h-8 w-full items-center justify-center gap-2 rounded-lg text-xs font-semibold text-sidebar-muted transition-colors hover:bg-white/[0.04] hover:text-white lg:flex"
            aria-label={collapsed ? 'Déplier la navigation' : 'Replier la navigation'}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <>
                <ChevronsLeft className="size-4" /> Replier
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
