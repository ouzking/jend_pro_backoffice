import { useState, type FormEvent } from 'react'
import { Check, KeyRound } from 'lucide-react'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Overlay'
import { useToast } from '@/components/ui/Toast'
import { toApiError } from '@/core/api/errors'
import { useAuth } from '@/core/auth'
import { cn } from '@/core/utils/cn'

const RULES = [
  { label: '8 caractères minimum', test: (v: string) => v.length >= 8 },
  { label: 'Au moins une lettre', test: (v: string) => /[a-zA-ZÀ-ÿ]/.test(v) },
  { label: 'Au moins un chiffre', test: (v: string) => /\d/.test(v) },
]

function usePasswordForm(onDone: () => void) {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = RULES.every((r) => r.test(password)) && password === confirm

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!valid || pending) return
    setPending(true)
    setError(null)
    try {
      await updatePassword(password)
      onDone()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }
  return { password, setPassword, confirm, setConfirm, pending, error, valid, submit }
}

function Fields({ form }: { form: ReturnType<typeof usePasswordForm> }) {
  return (
    <div className="space-y-4 text-left">
      <Field label="Nouveau mot de passe">
        <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => form.setPassword(e.target.value)} data-autofocus />
      </Field>
      <ul className="space-y-1">
        {RULES.map((r) => {
          const ok = r.test(form.password)
          return (
            <li key={r.label} className={cn('flex items-center gap-2 text-xs', ok ? 'text-success' : 'text-fg-subtle')}>
              <Check className={cn('size-3.5', !ok && 'opacity-30')} /> {r.label}
            </li>
          )
        })}
      </ul>
      <Field label="Confirmer le mot de passe" error={form.confirm && form.confirm !== form.password ? 'Les deux mots de passe ne correspondent pas.' : null}>
        <Input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => form.setConfirm(e.target.value)} />
      </Field>
      {form.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
          {form.error}
        </p>
      )}
    </div>
  )
}

/** Full screen after a password-reset / first-access link: nothing else until a password is chosen. */
export function SetPasswordScreen() {
  const { user, signOut } = useAuth()
  const toast = useToast()
  const form = usePasswordForm(() => toast.success('Mot de passe enregistré', 'Utilisez-le pour vos prochaines connexions.'))
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5">
      <form className="w-full max-w-sm animate-slide-up" onSubmit={form.submit}>
        <LogoMark className="size-12" />
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-fg">Choisissez votre mot de passe</h1>
        <p className="mt-1.5 mb-7 text-sm text-fg-muted">
          Pour le compte <span className="font-semibold text-fg">{user?.email}</span>.
        </p>
        <Fields form={form} />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-6 w-full"
          loading={form.pending}
          disabled={!form.valid}
          leftIcon={<KeyRound className="size-4" />}
        >
          Enregistrer le mot de passe
        </Button>
        <button type="button" onClick={() => void signOut()} className="mt-4 w-full text-center text-[13px] font-semibold text-fg-muted hover:text-fg">
          Annuler et se déconnecter
        </button>
      </form>
    </div>
  )
}

/** Settings › Mon compte: change the password of the signed-in account. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const form = usePasswordForm(() => {
    toast.success('Mot de passe modifié')
    onClose()
  })
  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!form.pending}
      size="sm"
      title="Changer mon mot de passe"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={form.pending}>
            Annuler
          </Button>
          <Button variant="primary" loading={form.pending} disabled={!form.valid} onClick={() => void form.submit()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <Fields form={form} />
    </Modal>
  )
}
