import { describe, expect, it } from 'vitest'
import { readEnv } from './env'

function fakeJwt(payload: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature`
}

describe('readEnv', () => {
  it('accepts a URL + publishable key', () => {
    expect(readEnv({ VITE_SUPABASE_URL: ' http://127.0.0.1:54421 ', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_x' })).toEqual({
      supabaseUrl: 'http://127.0.0.1:54421',
      supabasePublishableKey: 'sb_publishable_x',
    })
  })

  it('fails fast when configuration is missing', () => {
    expect(() => readEnv({})).toThrow(/Configuration manquante/)
  })

  it('refuses a secret / service_role key in the browser', () => {
    expect(() => readEnv({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc' })).toThrow(/interdite/)
    expect(() => readEnv({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_PUBLISHABLE_KEY: fakeJwt({ role: 'service_role' }) })).toThrow(/interdite/)
  })

  it('accepts a legacy anon JWT key', () => {
    expect(readEnv({ VITE_SUPABASE_URL: 'http://x', VITE_SUPABASE_PUBLISHABLE_KEY: fakeJwt({ role: 'anon' }) }).supabaseUrl).toBe('http://x')
  })
})
