/**
 * Display formatting. Amounts are integers in the currency minor unit
 * (XOF has none: 1500 = 1 500 FCFA) — never floats, never recomputed here.
 */
const LOCALE = 'fr-FR'
const TIMEZONE = 'Africa/Dakar'

const integerFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const compactFormatter = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
const percentFormatter = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1 })

/** Intl uses narrow no-break spaces in fr-FR; normalize to a regular no-break space. */
function nbsp(value: string): string {
  return value.replace(/\u202f/g, '\u00a0')
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return nbsp(integerFormatter.format(value))
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return nbsp(compactFormatter.format(value))
}

export function formatMoney(amount: number | null | undefined, currency = 'XOF'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—'
  const unit = currency === 'XOF' ? 'FCFA' : currency
  return `${formatNumber(amount)}\u00a0${unit}`
}

export function formatPercent(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return '—'
  return nbsp(percentFormatter.format(ratio))
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: TIMEZONE })
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE,
})
const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', timeZone: 'UTC' })
const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'short', year: '2-digit', timeZone: 'UTC' })

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return dateFormatter.format(toDate(value))
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return dateTimeFormatter.format(toDate(value))
}

/** Chart axis label of a YYYY-MM-DD bucket (calendar date, no timezone shift). */
export function formatBucket(isoDate: string, granularity: 'day' | 'week' | 'month'): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return nbsp(granularity === 'month' ? monthFormatter.format(date) : shortDayFormatter.format(date))
}

const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
const RELATIVE_STEPS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Number.POSITIVE_INFINITY],
]

export function formatRelative(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return '—'
  let delta = (toDate(value).getTime() - now.getTime()) / 1000
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) < size) return relativeFormatter.format(Math.round(delta), unit)
    delta /= size
  }
  return formatDate(value)
}

/** Whole days from now until `value` (negative when past). */
export function daysFromNow(value: string | Date, now: Date = new Date()): number {
  return Math.ceil((toDate(value).getTime() - now.getTime()) / 86_400_000)
}

export function initials(name: string | null | undefined, fallback = '?'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** Short, readable form of a UUID for tables (full value stays copyable). */
export function shortId(id: string): string {
  return id.slice(0, 8)
}
