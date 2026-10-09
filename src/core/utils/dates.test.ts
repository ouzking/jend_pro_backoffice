import { describe, expect, it } from 'vitest'
import { daysInRange, granularityFor, isPeriodPreset, previousRange, rangeForPreset } from './dates'

const TODAY = new Date('2026-10-09T15:00:00Z')

describe('dates', () => {
  it('builds inclusive ranges for presets', () => {
    expect(rangeForPreset('7d', TODAY)).toEqual({ from: '2026-10-03', to: '2026-10-09' })
    expect(rangeForPreset('30d', TODAY)).toEqual({ from: '2026-09-10', to: '2026-10-09' })
    expect(rangeForPreset('mtd', TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-09' })
    expect(rangeForPreset('ytd', TODAY)).toEqual({ from: '2026-01-01', to: '2026-10-09' })
  })

  it('never exceeds the backend limit of 366 days', () => {
    for (const preset of ['7d', '30d', '90d', '12m', 'mtd', 'ytd'] as const) {
      expect(daysInRange(rangeForPreset(preset, TODAY))).toBeLessThanOrEqual(367)
    }
    expect(daysInRange(rangeForPreset('7d', TODAY))).toBe(7)
  })

  it('picks a readable granularity', () => {
    expect(granularityFor(rangeForPreset('30d', TODAY))).toBe('day')
    expect(granularityFor(rangeForPreset('90d', TODAY))).toBe('week')
    expect(granularityFor(rangeForPreset('12m', TODAY))).toBe('month')
  })

  it('computes the previous period of identical length', () => {
    const range = rangeForPreset('7d', TODAY)
    const prev = previousRange(range)
    expect(prev).toEqual({ from: '2026-09-26', to: '2026-10-02' })
    expect(daysInRange(prev)).toBe(daysInRange(range))
  })

  it('validates presets coming from the URL', () => {
    expect(isPeriodPreset('30d')).toBe(true)
    expect(isPeriodPreset('1000d')).toBe(false)
    expect(isPeriodPreset(null)).toBe(false)
  })
})
