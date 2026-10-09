import { useId } from 'react'
import { cn } from '@/core/utils/cn'

/**
 * JËND PRO monogram (brand book "Maquettes"): a J with a flat, bevelled top
 * bar and a wide bowl, plus the "Menthe Signal" square on its upper left.
 * Geometry is shared by every variant so the mark never drifts.
 */
const J_PATH = 'M24.6 5.5h13.1l-2.6 4.8h-3.3v18.2c0 8.4-5.2 13.9-13.1 13.9-5.3 0-9.3-2.4-11.7-6.4l5.2-3.6c1.5 2.5 3.6 3.8 6.3 3.8 3.9 0 6.1-2.6 6.1-7.6V10.3z'
const SQUARE = { x: 13, y: 11.5, size: 7.6 }
/** Square crop centred on the drawing. */
const VIEWBOX = '2.4 4 40 40'

export type MarkTone = 'light' | 'forest' | 'brass'

const TONES: Record<MarkTone, { j: string; square: string }> = {
  light: { j: '#f4f6f3', square: '#8fe3c2' },
  forest: { j: '#165a3f', square: '#2fb383' },
  brass: { j: '#c69a5b', square: '#8fe3c2' },
}

/** Bare monogram (on any background). */
export function JMark({ tone = 'light', className }: { tone?: MarkTone; className?: string }) {
  const c = TONES[tone]
  return (
    <svg viewBox={VIEWBOX} className={cn('size-6', className)} aria-hidden>
      <rect x={SQUARE.x} y={SQUARE.y} width={SQUARE.size} height={SQUARE.size} rx="1.2" fill={c.square} />
      <path d={J_PATH} fill={c.j} />
    </svg>
  )
}

/** App-icon tile: enamelled forest green with the white J (as on the phone icon). */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 48 48" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a9a68" />
          <stop offset="1" stopColor="#135c3e" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${id}-tile)`} />
      <rect width="48" height="48" rx="12" fill={`url(#${id}-sheen)`} />
      <rect x="0.5" y="0.5" width="47" height="47" rx="11.5" fill="none" stroke="rgb(255 255 255 / 0.14)" />
      <g transform="translate(5.6 4.4) scale(0.8)">
        <rect x={SQUARE.x} y={SQUARE.y} width={SQUARE.size} height={SQUARE.size} rx="1.2" fill="#c9f5e2" />
        <path d={J_PATH} fill="#ffffff" />
      </g>
    </svg>
  )
}

/** Wordmark "JËND PRO" in the geometric display face. */
export function Wordmark({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  return <span className={cn('font-display font-semibold tracking-[0.04em]', tone === 'light' ? 'text-[#f4f6f3]' : 'text-fg', className)}>JËND PRO</span>
}

export function Logo({ collapsed = false, tone = 'light' }: { collapsed?: boolean; tone?: 'light' | 'dark' }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <div className="leading-none">
          <Wordmark tone={tone} className="text-[17px]" />
          <p className={cn('mt-1 text-[10px] font-semibold tracking-[0.2em] uppercase', tone === 'light' ? 'text-mint/70' : 'text-fg-subtle')}>Console</p>
        </div>
      )}
    </div>
  )
}
