/**
 * Reporting periods. The backend counts in Dakar days (UTC+0, no DST) and
 * takes inclusive YYYY-MM-DD bounds, max 366 days.
 */
export type PeriodPreset = '7d' | '30d' | '90d' | '12m' | 'mtd' | 'ytd'
export type Granularity = 'day' | 'week' | 'month'

export interface DateRange {
  from: string
  to: string
}

export const PERIOD_PRESETS: ReadonlyArray<{ value: PeriodPreset; label: string; short: string }> = [
  { value: '7d', label: '7 derniers jours', short: '7 j' },
  { value: '30d', label: '30 derniers jours', short: '30 j' },
  { value: '90d', label: '90 derniers jours', short: '90 j' },
  { value: '12m', label: '12 derniers mois', short: '12 m' },
  { value: 'mtd', label: 'Mois en cours', short: 'Mois' },
  { value: 'ytd', label: 'Année en cours', short: 'Année' },
]

/** YYYY-MM-DD of a date in Dakar time (= UTC). */
export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime())
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

export function rangeForPreset(preset: PeriodPreset, today: Date = new Date()): DateRange {
  const to = toIsoDay(today)
  switch (preset) {
    case '7d':
      return { from: toIsoDay(addDays(today, -6)), to }
    case '30d':
      return { from: toIsoDay(addDays(today, -29)), to }
    case '90d':
      return { from: toIsoDay(addDays(today, -89)), to }
    case '12m':
      return { from: toIsoDay(addDays(today, -364)), to }
    case 'mtd':
      return { from: `${to.slice(0, 7)}-01`, to }
    case 'ytd':
      return { from: `${to.slice(0, 4)}-01-01`, to }
  }
}

export function daysInRange(range: DateRange): number {
  const ms = new Date(`${range.to}T00:00:00Z`).getTime() - new Date(`${range.from}T00:00:00Z`).getTime()
  return Math.round(ms / 86_400_000) + 1
}

/** Keeps charts readable: ~7 to ~60 points whatever the period. */
export function granularityFor(range: DateRange): Granularity {
  const days = daysInRange(range)
  if (days <= 62) return 'day'
  if (days <= 182) return 'week'
  return 'month'
}

/** The period of identical length just before `range` (for deltas). */
export function previousRange(range: DateRange): DateRange {
  const days = daysInRange(range)
  const from = new Date(`${range.from}T00:00:00Z`)
  return { from: toIsoDay(addDays(from, -days)), to: toIsoDay(addDays(from, -1)) }
}

export function isPeriodPreset(value: string | null): value is PeriodPreset {
  return PERIOD_PRESETS.some((p) => p.value === value)
}
