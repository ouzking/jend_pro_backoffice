import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { granularityFor, isPeriodPreset, rangeForPreset, type DateRange, type Granularity, type PeriodPreset } from '@/core/utils/dates'

/** Period held in the URL (?period=30d): shared links keep the same view. */
export function usePeriod(defaultPreset: PeriodPreset = '30d'): {
  preset: PeriodPreset
  range: DateRange
  granularity: Granularity
  setPreset: (p: PeriodPreset) => void
} {
  const [params, setParams] = useSearchParams()
  const raw = params.get('period')
  const preset = isPeriodPreset(raw) ? raw : defaultPreset
  // Recomputed once per preset change (stable query keys within a day).
  const range = useMemo(() => rangeForPreset(preset), [preset])
  return {
    preset,
    range,
    granularity: granularityFor(range),
    setPreset: (p) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (p === defaultPreset) next.delete('period')
          else next.set('period', p)
          return next
        },
        { replace: true },
      ),
  }
}
