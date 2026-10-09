import type { ReactNode } from 'react'
import type { EnumMeta, Tone } from '@/core/config/domain'
import { cn } from '@/core/utils/cn'

const TONES: Record<Tone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-neutral-soft text-fg-muted ring-border', dot: 'bg-fg-subtle' },
  brand: { badge: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/25', dot: 'bg-brand-500' },
  success: { badge: 'bg-success-soft text-success ring-success/20', dot: 'bg-success' },
  warning: { badge: 'bg-warning-soft text-warning ring-warning/25', dot: 'bg-warning' },
  danger: { badge: 'bg-danger-soft text-danger ring-danger/20', dot: 'bg-danger' },
  info: { badge: 'bg-info-soft text-info ring-info/20', dot: 'bg-info' },
  accent: { badge: 'bg-accent-soft text-accent-fg ring-accent/30', dot: 'bg-accent' },
}

export interface BadgeProps {
  tone?: Tone
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
  title?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', dot = false, size = 'sm', className, title, children }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 truncate rounded-full font-semibold ring-1 ring-inset',
        size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
        TONES[tone].badge,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 shrink-0 rounded-full', TONES[tone].dot)} aria-hidden />}
      {children}
    </span>
  )
}

/** Renders any backend enum through its central EnumMeta (src/core/config/domain.ts). */
export function StatusBadge<T extends string>({ value, map, size }: { value: T | null | undefined; map: Record<T, EnumMeta>; size?: 'sm' | 'md' }) {
  if (!value) return <span className="text-fg-subtle">—</span>
  const meta = map[value]
  if (!meta) return <Badge size={size}>{value}</Badge>
  return (
    <Badge tone={meta.tone} dot size={size} title={meta.description}>
      {meta.label}
    </Badge>
  )
}
