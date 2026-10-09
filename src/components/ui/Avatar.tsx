import { cn } from '@/core/utils/cn'
import { initials } from '@/core/utils/format'

const PALETTE = [
  'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
]

/** Stable color per seed (id / e-mail) so a person keeps the same avatar everywhere. */
function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export function Avatar({
  name,
  seed,
  size = 'md',
  square = false,
  className,
}: {
  name: string | null | undefined
  seed?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  square?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center font-bold select-none',
        square ? 'rounded-lg' : 'rounded-full',
        size === 'xs' && 'size-6 text-[10px]',
        size === 'sm' && 'size-7 text-[11px]',
        size === 'md' && 'size-9 text-xs',
        size === 'lg' && 'size-12 text-base',
        colorFor(seed ?? name ?? '?'),
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

/** Avatar + primary / secondary lines, the standard "person" cell. */
export function Identity({ name, secondary, seed, square }: { name: string | null; secondary?: string | null; seed?: string; square?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name ?? secondary} seed={seed} size="sm" square={square} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-fg">{name || secondary || '—'}</p>
        {secondary && name && <p className="truncate text-xs text-fg-subtle">{secondary}</p>}
      </div>
    </div>
  )
}
