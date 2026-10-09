import { describe, expect, it } from 'vitest'
import { ApiError, toApiError, unwrap } from './errors'
import { blankToUndefined, toLimitOffset, toPage } from './paging'

describe('toApiError', () => {
  it('maps backend business codes to a stable code, kind and French message', () => {
    const e = toApiError({ message: 'PERMISSION_DENIED', code: '42501', details: 'businesses.manage' })
    expect(e).toBeInstanceOf(ApiError)
    expect(e.code).toBe('PERMISSION_DENIED')
    expect(e.kind).toBe('forbidden')
    expect(e.message).toMatch(/permission/i)
    expect(e.detail).toBe('businesses.manage')
  })

  it('classifies by SQLSTATE', () => {
    expect(toApiError({ message: 'BUSINESS_NOT_FOUND', code: 'P0002' }).kind).toBe('not_found')
    expect(toApiError({ message: 'REASON_REQUIRED', code: '22023' }).kind).toBe('validation')
    expect(toApiError({ message: 'LAST_SUPER_ADMIN', code: 'P0001' }).kind).toBe('conflict')
    expect(toApiError({ message: 'NOT_AUTHENTICATED', code: '42501' }).kind).toBe('auth')
  })

  it('keeps unknown business codes with a generic message', () => {
    const e = toApiError({ message: 'SOMETHING_NEW', code: 'P0001' })
    expect(e.code).toBe('SOMETHING_NEW')
    expect(e.message).toBe('Une erreur est survenue.')
  })

  it('detects network failures', () => {
    expect(toApiError(new TypeError('Failed to fetch')).kind).toBe('network')
    expect(toApiError({ message: 'TypeError: Failed to fetch' }).kind).toBe('network')
  })

  it('maps expired JWTs to an auth error', () => {
    expect(toApiError({ message: 'JWT expired', code: 'PGRST301' }).kind).toBe('auth')
  })

  it('never throws on garbage', () => {
    expect(toApiError(undefined).kind).toBe('unknown')
    expect(toApiError('boom').kind).toBe('unknown')
  })

  it('unwrap returns data or throws an ApiError', () => {
    expect(unwrap({ data: [1], error: null })).toEqual([1])
    expect(() => unwrap({ data: null, error: { message: 'TICKET_CLOSED', code: 'P0001' } })).toThrow(ApiError)
  })
})

describe('paging', () => {
  it('converts 1-based pages to limit/offset and clamps to the backend maximum', () => {
    expect(toLimitOffset({ page: 1, pageSize: 25 })).toEqual({ p_limit: 25, p_offset: 0 })
    expect(toLimitOffset({ page: 3, pageSize: 50 })).toEqual({ p_limit: 50, p_offset: 100 })
    expect(toLimitOffset({ page: 0, pageSize: 1000 })).toEqual({ p_limit: 100, p_offset: 0 })
  })

  it('reads the window total_count of the first row', () => {
    const page = toPage(
      [
        { total_count: 42, id: 'a' },
        { total_count: 42, id: 'b' },
      ],
      (r) => r.id,
    )
    expect(page).toEqual({ items: ['a', 'b'], total: 42 })
    expect(toPage(null, (r: { total_count: number }) => r)).toEqual({ items: [], total: 0 })
  })

  it('treats blank filters as no filter', () => {
    expect(blankToUndefined('')).toBeUndefined()
    expect(blankToUndefined('ACTIVE')).toBe('ACTIVE')
  })
})
