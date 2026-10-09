import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type Column } from './DataTable'

interface Row {
  id: string
  name: string
  amount: number
}

const columns: Column<Row, 'name'>[] = [
  { id: 'name', header: 'Nom', sortKey: 'name', cell: (r) => r.name },
  { id: 'amount', header: 'Montant', align: 'right', cell: (r) => r.amount },
]
const rows: Row[] = [
  { id: '1', name: 'Boutique A', amount: 10 },
  { id: '2', name: 'Boutique B', amount: 20 },
]

describe('DataTable', () => {
  it('renders rows and handles row clicks', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<DataTable id="t1" columns={columns} rows={rows} getRowId={(r) => r.id} onRowClick={onRowClick} />)
    await user.click(screen.getByText('Boutique B'))
    expect(onRowClick).toHaveBeenCalledWith(rows[1])
  })

  it('shows the empty state', () => {
    render(<DataTable id="t2" columns={columns} rows={[]} getRowId={(r) => r.id} empty={{ title: 'Aucune entreprise' }} />)
    expect(screen.getByText('Aucune entreprise')).toBeInTheDocument()
  })

  it('shows the error state with a retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<DataTable id="t3" columns={columns} rows={undefined} getRowId={(r) => r.id} error={new TypeError('Failed to fetch')} onRetry={onRetry} />)
    expect(screen.getByText('Connexion impossible')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('emits server-side sort changes', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    render(<DataTable id="t4" columns={columns} rows={rows} getRowId={(r) => r.id} sort={{ key: 'name', direction: 'desc' }} onSortChange={onSortChange} />)
    await user.click(screen.getByRole('button', { name: /Nom/ }))
    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'asc' })
  })

  it('supports selection of the visible page', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DataTable id="t5" columns={columns} rows={rows} getRowId={(r) => r.id} selection={{ selected: new Set(), onChange }} />)
    await user.click(screen.getByLabelText('Tout sélectionner'))
    expect(onChange).toHaveBeenCalledWith(new Set(['1', '2']))
  })

  it('lets the user hide a column and remembers it', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<DataTable id="t6" columns={columns} rows={rows} getRowId={(r) => r.id} />)
    await user.click(screen.getByRole('button', { name: /Colonnes/ }))
    await user.click(within(screen.getByRole('menu')).getByText(/Montant/))
    expect(screen.queryByRole('columnheader', { name: 'Montant' })).not.toBeInTheDocument()
    unmount()
    render(<DataTable id="t6" columns={columns} rows={rows} getRowId={(r) => r.id} />)
    expect(screen.queryByRole('columnheader', { name: 'Montant' })).not.toBeInTheDocument()
  })
})
