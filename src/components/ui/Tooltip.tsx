import type { ReactNode } from 'react'
import { cn } from '@/core/utils/cn'

/** CSS-only tooltip (hover + keyboard focus), no positioning engine needed. */
export function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom'
  className?: string
}) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 w-max max-w-64 rounded-md bg-[#0b1a14] px-2 py-1 text-xs font-medium text-white opacity-0 shadow-pop transition-opacity duration-150',
          'group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 dark:bg-[#e7efe9] dark:text-[#0b1a14]',
          side === 'top' && 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-1.5 -translate-x-1/2',
          side === 'right' && 'top-1/2 left-full ml-2 -translate-y-1/2',
        )}
      >
        {content}
      </span>
    </span>
  )
}
