import { describe, expect, it } from 'vitest'
import { daysFromNow, formatBucket, formatMoney, formatNumber, formatPercent, formatRelative, initials, shortId } from './format'

const NBSP = ' '

describe('format', () => {
  it('formats XOF amounts as integers with FCFA (no decimals, no float)', () => {
    expect(formatMoney(1500)).toBe(`1${NBSP}500${NBSP}FCFA`)
    expect(formatMoney(0)).toBe(`0${NBSP}FCFA`)
    expect(formatMoney(1234567)).toBe(`1${NBSP}234${NBSP}567${NBSP}FCFA`)
  })

  it('shows a dash for missing values instead of 0', () => {
    expect(formatMoney(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(Number.NaN)).toBe('—')
  })

  it('uses a regular no-break space (no narrow NBSP leaking into the UI)', () => {
    expect(formatNumber(10000)).not.toContain(' ')
  })

  it('formats percentages from ratios', () => {
    expect(formatPercent(0.125)).toBe(`12,5${NBSP}%`)
  })

  it('formats chart buckets without timezone shifts', () => {
    expect(formatBucket('2026-10-01', 'day')).toMatch(/01/)
    expect(formatBucket('2026-10-01', 'month')).toMatch(/oct/i)
  })

  it('formats relative times', () => {
    const now = new Date('2026-10-09T12:00:00Z')
    expect(formatRelative('2026-10-09T11:00:00Z', now)).toMatch(/heure/)
    expect(formatRelative('2026-10-07T12:00:00Z', now)).toMatch(/avant-hier|2 jours/)
  })

  it('computes days until a date', () => {
    const now = new Date('2026-10-09T00:00:00Z')
    expect(daysFromNow('2026-10-16T00:00:00Z', now)).toBe(7)
    expect(daysFromNow('2026-10-08T00:00:00Z', now)).toBe(-1)
  })

  it('builds initials and short ids', () => {
    expect(initials('Awa Ndiaye')).toBe('AN')
    expect(initials('  moussa  ')).toBe('M')
    expect(initials(null)).toBe('?')
    expect(shortId('0f2b9a1c-1111-2222-3333-444455556666')).toBe('0f2b9a1c')
  })
})
