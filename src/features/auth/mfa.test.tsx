import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useAuth } from '@/core/auth'
import { needsMfa, toPermissionSet } from '@/core/permissions/permissions'
import { fakeAuthRepository, Providers, STAFF, staffAccess } from '@/test/utils'
import { RequireStaff } from './guards'

function renderProtected(repository: ReturnType<typeof fakeAuthRepository>) {
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <p>Page de connexion</p> },
      {
        path: '/',
        element: (
          <RequireStaff>
            <p>Console</p>
          </RequireStaff>
        ),
      },
    ],
    { initialEntries: ['/'] },
  )
  return render(
    <Providers repository={repository}>
      <RouterProvider router={router} />
    </Providers>,
  )
}

describe('two-factor authentication', () => {
  it('asks enrolled staff for their code before opening the console', async () => {
    const user = userEvent.setup()
    renderProtected(fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read'], { mfaEnrolled: true, aal: 'aal1' }) }))

    expect(await screen.findByText('Double authentification')).toBeInTheDocument()
    expect(screen.queryByText('Console')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Code à 6 chiffres'), '000000')
    expect(await screen.findByRole('alert')).toHaveTextContent(/incorrect/)
    expect(screen.queryByText('Console')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Code à 6 chiffres'), '123456')
    expect(await screen.findByText('Console')).toBeInTheDocument()
  })

  it('does not challenge staff who have not enrolled', async () => {
    renderProtected(fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']) }))
    expect(await screen.findByText('Console')).toBeInTheDocument()
  })

  it('flags sensitive actions that need a verified session', async () => {
    function Probe() {
      const { status, needsMfa: check } = useAuth()
      return <p data-testid="probe">{status === 'ready' ? `${check('businesses.manage')}/${check('businesses.read')}` : status}</p>
    }
    const access = staffAccess(['businesses.read', 'businesses.manage'], { mfaPermissions: toPermissionSet(['businesses.manage']) })
    render(
      <Providers repository={fakeAuthRepository({ user: STAFF, access })}>
        <Probe />
      </Providers>,
    )
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('true/false'))
  })

  it('needsMfa follows the server rules', () => {
    const base = staffAccess(['businesses.read', 'businesses.manage'], { mfaPermissions: toPermissionSet(['businesses.manage']) })
    expect(needsMfa(base, 'businesses.manage')).toBe(true)
    expect(needsMfa(base, 'businesses.read')).toBe(false)
    expect(needsMfa({ ...base, mfaEnrolled: true }, 'businesses.read')).toBe(true)
    expect(needsMfa({ ...base, aal: 'aal2' }, 'businesses.manage')).toBe(false)
  })
})
