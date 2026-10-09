import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTestQueryClient, fakeAuthRepository, Providers, STAFF, staffAccess } from '@/test/utils'
import { useAuth } from './AuthProvider'

function Probe() {
  const { status, user, can } = useAuth()
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.email ?? 'none'}</p>
      <p data-testid="can-support">{String(can('support.read'))}</p>
      <p data-testid="can-billing">{String(can('billing.manage'))}</p>
    </div>
  )
}

const status = () => screen.getByTestId('status').textContent

describe('AuthProvider', () => {
  it('is anonymous without a session', async () => {
    render(
      <Providers repository={fakeAuthRepository({ user: null })}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(status()).toBe('anonymous'))
  })

  it('is ready for active staff, with their permissions only', async () => {
    render(
      <Providers repository={fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']) })}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(status()).toBe('ready'))
    expect(screen.getByTestId('can-support').textContent).toBe('true')
    expect(screen.getByTestId('can-billing').textContent).toBe('false')
  })

  it('forbids a signed-in merchant who is not staff', async () => {
    render(
      <Providers repository={fakeAuthRepository({ user: STAFF, access: null })}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(status()).toBe('forbidden'))
    expect(screen.getByTestId('can-support').textContent).toBe('false')
  })

  it('forbids a suspended staff member', async () => {
    render(
      <Providers repository={fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read'], { status: 'SUSPENDED' }) })}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(status()).toBe('forbidden'))
  })

  it('reports an error (not a silent pass) when access cannot be verified', async () => {
    render(
      <Providers repository={fakeAuthRepository({ user: STAFF, accessError: new TypeError('Failed to fetch') })}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(status()).toBe('error'))
    expect(screen.getByTestId('can-support').textContent).toBe('false')
  })

  it('clears cached data when the account changes (no data leak between sessions)', async () => {
    const repo = fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']) })
    const client = createTestQueryClient()
    render(
      <Providers repository={repo} client={client}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(status()).toBe('ready'))
    client.setQueryData(['businesses', 'secret'], { name: 'Boutique' })

    await act(async () => repo.emit(null))
    await waitFor(() => expect(status()).toBe('anonymous'))
    expect(client.getQueryData(['businesses', 'secret'])).toBeUndefined()
  })

  it('ignores token refreshes of the same user', async () => {
    const repo = fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']) })
    const client = createTestQueryClient()
    render(
      <Providers repository={repo} client={client}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(status()).toBe('ready'))
    client.setQueryData(['k'], 1)
    await act(async () => repo.emit({ ...STAFF }))
    expect(client.getQueryData(['k'])).toBe(1)
    expect(status()).toBe('ready')
  })
})
