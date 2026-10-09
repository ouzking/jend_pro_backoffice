import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { PlatformPermission } from '@/core/permissions/permissions'
import { fakeAuthRepository, Providers, STAFF, staffAccess } from '@/test/utils'
import { RequirePermission, RequireStaff } from './guards'

function renderAt(path: string, repository: ReturnType<typeof fakeAuthRepository>, permission: PlatformPermission = 'billing.read') {
  const router = createMemoryRouter(
    [
      { path: '/connexion', element: <p>Page de connexion</p> },
      {
        path: '/',
        element: (
          <RequireStaff>
            <RequirePermission permission={permission}>
              <p>Contenu protégé</p>
            </RequirePermission>
          </RequireStaff>
        ),
      },
    ],
    { initialEntries: [path] },
  )
  return render(
    <Providers repository={repository}>
      <RouterProvider router={router} />
    </Providers>,
  )
}

describe('route guards', () => {
  it('redirects anonymous visitors to the login page', async () => {
    renderAt('/', fakeAuthRepository({ user: null }))
    expect(await screen.findByText('Page de connexion')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('blocks a signed-in account that is not staff', async () => {
    renderAt('/', fakeAuthRepository({ user: STAFF, access: null }))
    expect(await screen.findByText(/Accès réservé à l’équipe JËND PRO/)).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('blocks staff without the route permission', async () => {
    renderAt('/', fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']) }))
    expect(await screen.findByText('Accès non autorisé')).toBeInTheDocument()
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument()
  })

  it('lets authorized staff through', async () => {
    renderAt('/', fakeAuthRepository({ user: STAFF, access: staffAccess(['billing.read']) }))
    expect(await screen.findByText('Contenu protégé')).toBeInTheDocument()
  })

  it('offers a retry when access cannot be verified', async () => {
    renderAt('/', fakeAuthRepository({ user: STAFF, accessError: new TypeError('Failed to fetch') }))
    expect(await screen.findByText('Impossible de vérifier votre accès')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
