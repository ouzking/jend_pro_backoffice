import { useState, type FormEvent } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { LogoMark } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { CodeInput } from '@/components/ui/CodeInput'
import { toApiError } from '@/core/api/errors'
import { useAuth } from '@/core/auth'

/** Second login step for staff with an enrolled authenticator (session aal1 → aal2). */
export function MfaChallenge() {
  const { user, verifyMfa, signOut } = useAuth()
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (value = code) => {
    if (value.length !== 6 || pending) return
    setPending(true)
    setError(null)
    try {
      await verifyMfa(value)
    } catch (e) {
      setError(toApiError(e).message)
      setCode('')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-5">
      <form
        className="w-full max-w-sm animate-slide-up text-center"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void submit()
        }}
      >
        <LogoMark className="mx-auto size-12" />
        <div className="mx-auto mt-6 grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-mint">
          <ShieldCheck className="size-5" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight text-fg">Double authentification</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Saisissez le code à 6 chiffres affiché par votre application d’authentification pour <span className="font-semibold text-fg">{user?.email}</span>.
        </p>
        <CodeInput
          className="mt-7"
          value={code}
          onValueChange={setCode}
          onComplete={(c) => void submit(c)}
          aria-label="Code à 6 chiffres"
          aria-invalid={Boolean(error)}
          autoFocus
        />
        {error && (
          <p role="alert" className="mt-3 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" className="mt-5 w-full" loading={pending} disabled={code.length !== 6}>
          Vérifier
        </Button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-fg-muted hover:text-fg"
        >
          <LogOut className="size-3.5" /> Utiliser un autre compte
        </button>
        <p className="mt-8 text-xs text-fg-subtle">Téléphone perdu ? Contactez un super administrateur JËND PRO.</p>
      </form>
    </div>
  )
}
