import { cn } from '@/core/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:text-brand-fg dark:hover:bg-brand-400',
  secondary: 'bg-surface text-fg border border-border shadow-xs hover:bg-surface-2 hover:border-border-strong active:bg-surface-3',
  ghost: 'text-fg-muted hover:text-fg hover:bg-surface-3',
  subtle: 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20',
  danger: 'bg-danger text-white shadow-xs hover:brightness-95 active:brightness-90',
}

export const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
}

/** Button look for non-button elements (router links): avoids <a><button> nesting. */
export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string): string {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}
