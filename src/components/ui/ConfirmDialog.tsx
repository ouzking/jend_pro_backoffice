import { useState, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { toApiError } from '@/core/api/errors'
import { Button } from './Button'
import { Field, Input, Textarea } from './Field'
import { Modal } from './Overlay'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  /** May throw (any transport error): its message is shown and the dialog stays open. */
  onConfirm: (reason: string) => Promise<void> | void
  title: string
  description?: ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  /** Asks for a justification (recorded in the audit trail by the backend). */
  reason?: { label: string; placeholder?: string; minLength?: number }
  /** Typed confirmation for irreversible actions (e.g. the business name). */
  confirmText?: string
}

/** Every destructive or sensitive action goes through this dialog. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmer',
  tone = 'danger',
  reason,
  confirmText,
}: ConfirmDialogProps) {
  const [reasonValue, setReasonValue] = useState('')
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const minLength = reason?.minLength ?? 3
  const reasonOk = !reason || reasonValue.trim().length >= minLength
  const typedOk = !confirmText || typed.trim() === confirmText

  const close = () => {
    if (pending) return
    setReasonValue('')
    setTyped('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    setPending(true)
    setError(null)
    try {
      await onConfirm(reasonValue.trim())
      setReasonValue('')
      setTyped('')
      onClose()
    } catch (e) {
      setError(toApiError(e).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!pending}
      size="sm"
      title={
        <span className="flex items-center gap-2.5">
          {tone === 'danger' && (
            <span className="grid size-7 place-items-center rounded-lg bg-danger-soft text-danger">
              <AlertTriangle className="size-4" />
            </span>
          )}
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={pending}>
            Annuler
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={pending} disabled={!reasonOk || !typedOk} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {description && <div className="text-sm text-fg-muted">{description}</div>}
        {reason && (
          <Field label={reason.label} required hint={`${minLength} caractères minimum — enregistré dans le journal d’audit.`}>
            <Textarea
              rows={3}
              value={reasonValue}
              onChange={(e) => setReasonValue(e.target.value)}
              placeholder={reason.placeholder}
              data-autofocus
              maxLength={500}
            />
          </Field>
        )}
        {confirmText && (
          <Field
            label={
              <>
                Tapez <span className="font-mono text-danger">{confirmText}</span> pour confirmer
              </>
            }
          >
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </Field>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
