import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('requires a reason and the typed confirmation before a destructive action', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        onClose={() => undefined}
        onConfirm={onConfirm}
        title="Suspendre ?"
        confirmLabel="Suspendre"
        reason={{ label: 'Motif' }}
        confirmText="Boutique Démo"
      />,
    )
    const confirm = screen.getByRole('button', { name: 'Suspendre' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/Motif/), 'Fraude')
    expect(confirm).toBeDisabled()
    await user.type(screen.getByLabelText(/pour confirmer/), 'Boutique Démo')
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith('Fraude')
  })

  it('keeps the dialog open and shows the backend message on failure', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={async () => {
          throw { message: 'LAST_SUPER_ADMIN', code: 'P0001' }
        }}
        title="Suspendre ?"
        confirmLabel="Suspendre"
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Suspendre' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/au moins un super administrateur/))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes after success', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ConfirmDialog open onClose={onClose} onConfirm={async () => undefined} title="Ok ?" confirmLabel="Valider" tone="primary" />)
    await user.click(screen.getByRole('button', { name: 'Valider' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
