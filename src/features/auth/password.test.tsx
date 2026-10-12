import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { fakeAuthRepository, Providers, STAFF, staffAccess } from '@/test/utils'
import { RequireStaff } from './guards'

function renderProtected(repository: ReturnType<typeof fakeAuthRepository>) {
  const router = createMemoryRouter(
    [
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

describe('password reset / first access', () => {
  it('requires choosing a password before opening the console', async () => {
    const user = userEvent.setup()
    renderProtected(fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']), recovery: true }))

    expect(await screen.findByText('Choisissez votre mot de passe')).toBeInTheDocument()
    expect(screen.queryByText('Console')).not.toBeInTheDocument()

    const save = screen.getByRole('button', { name: /Enregistrer le mot de passe/ })
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'jendpro2026')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'jendpro2025')
    expect(screen.getByText('Les deux mots de passe ne correspondent pas.')).toBeInTheDocument()
    expect(save).toBeDisabled()

    await user.clear(screen.getByLabelText('Confirmer le mot de passe'))
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'jendpro2026')
    await user.click(save)
    expect(await screen.findByText('Console')).toBeInTheDocument()
  })

  it('rejects passwords that do not meet the rules', async () => {
    const user = userEvent.setup()
    renderProtected(fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']), recovery: true }))
    await screen.findByText('Choisissez votre mot de passe')
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'abcdefgh')
    await user.type(screen.getByLabelText('Confirmer le mot de passe'), 'abcdefgh')
    expect(screen.getByRole('button', { name: /Enregistrer le mot de passe/ })).toBeDisabled()
  })

  it('goes straight to the console after a normal login', async () => {
    renderProtected(fakeAuthRepository({ user: STAFF, access: staffAccess(['support.read']) }))
    expect(await screen.findByText('Console')).toBeInTheDocument()
  })
})
