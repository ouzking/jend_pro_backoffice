/** Fixed categorical order (validated palette in src/index.css). Never cycled. */
export const SERIES_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'] as const

export type ColorSlot = 0 | 1 | 2 | 3 | 4

export interface Series<T> {
  key: keyof T & string
  label: string
  /** Index in SERIES_COLORS — bound to the entity, not to its rank. */
  color: ColorSlot
}

/** Signed relative change, null when not computable (no base). */
export function relativeDelta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / previous
}
