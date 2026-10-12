import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { JMark, LogoMark, Wordmark } from '@/components/layout/Logo'
import { toApiError } from '@/core/api/errors'
import { useAuth } from '@/core/auth'

type Mode = 'login' | 'reset' | 'reset-sent'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function LoginPage() {
  const { status, signIn, requestPasswordReset } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (status === 'ready') return <Navigate to={from} replace />

  const sendReset = async () => {
    setPending(true)
    setError(null)
    try {
      await requestPasswordReset(email)
      setMode('reset-sent')
    } catch (err) {
      setMode('reset')
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await requestPasswordReset(email)
        setMode('reset-sent')
      }
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#0a1d16] p-12 text-white lg:flex lg:flex-col">
        {/* The head-office wall: deep green, soft light from the top right, LED halo behind the sign. */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_85%_0%,rgb(120_170_140/0.28),transparent_70%),radial-gradient(60%_60%_at_30%_45%,rgb(143_227_194/0.10),transparent_70%),linear-gradient(180deg,transparent_55%,rgb(3_10_7/0.65))]"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <LogoMark className="size-10" />
          <div className="leading-none">
            <Wordmark className="text-xl" />
            <p className="mt-1.5 text-[10px] font-semibold tracking-[0.22em] text-mint/70 uppercase">Console plateforme</p>
          </div>
        </div>

        <div className="relative my-auto flex flex-col items-start py-10">
          <div className="flex items-end gap-5 drop-shadow-[0_0_28px_rgb(143_227_194/0.18)]">
            <JMark tone="brass" className="size-24" />
            <Wordmark className="bg-gradient-to-b from-[#e2bd86] via-[#b8864b] to-[#7a5424] bg-clip-text pb-1 text-6xl text-transparent" />
          </div>
          <p className="mt-6 text-[11px] font-semibold tracking-[0.32em] text-[#d9b98c]/80 uppercase">La plateforme intelligente pour piloter son commerce</p>
        </div>

        <div className="relative max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-mint">
            <span className="size-1.5 rounded-[2px] bg-mint" /> Espace réservé à l’équipe JËND PRO
          </p>
          <h1 className="text-[34px] leading-[1.12] font-extrabold tracking-tight">Le centre de contrôle des commerces d’Afrique de l’Ouest.</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/60">
            Entreprises, abonnements, paiements, support et indicateurs : une vue précise et sécurisée de toute la plateforme.
          </p>
          <div className="mt-8 flex items-center gap-6 text-xs text-white/45">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-mint" /> Accès contrôlé côté serveur
            </span>
            <span>Toutes les actions sont auditées</span>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="size-10" />
            <Wordmark tone="dark" className="text-xl" />
          </div>

          {mode === 'reset-sent' ? (
            <div className="animate-slide-up">
              <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
                <Mail className="size-5" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-fg">Vérifiez votre boîte mail</h2>
              <p className="mt-2 text-sm text-fg-muted">
                Si un compte existe pour <span className="font-semibold text-fg">{email}</span>, un lien de réinitialisation vient d’être envoyé. Pensez à
                vérifier les courriers indésirables ; le lien est valable une heure.
              </p>
              <Button className="mt-8 w-full" size="lg" variant="secondary" leftIcon={<ArrowLeft className="size-4" />} onClick={() => setMode('login')}>
                Retour à la connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="animate-slide-up" noValidate>
              <h2 className="text-2xl font-extrabold tracking-tight text-fg">{mode === 'login' ? 'Connexion' : 'Mot de passe oublié'}</h2>
              <p className="mt-1.5 text-sm text-fg-muted">
                {mode === 'login' ? 'Accédez à la console d’administration.' : 'Recevez un lien pour choisir un nouveau mot de passe.'}
              </p>

              <div className="mt-8 space-y-4">
                <Field label="Adresse e-mail">
                  <Input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom@jendpro.sn"
                    className="h-11"
                    autoFocus
                  />
                </Field>
                {mode === 'login' && (
                  <Field label="Mot de passe">
                    <Input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                    />
                  </Field>
                )}
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] font-medium text-danger">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-6 w-full"
                loading={pending}
                disabled={!email || (mode === 'login' && password.length < 1)}
                leftIcon={mode === 'login' ? <Lock className="size-4" /> : <Mail className="size-4" />}
              >
                {mode === 'login' ? 'Se connecter' : 'Envoyer le lien'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setError(null)
                  // E-mail already typed: one click sends the link (what people expect).
                  if (mode === 'login' && EMAIL_RE.test(email.trim())) void sendReset()
                  else setMode(mode === 'login' ? 'reset' : 'login')
                }}
                className="mt-4 w-full text-center text-[13px] font-semibold text-fg-muted transition-colors hover:text-fg"
              >
                {mode === 'login' ? 'Mot de passe oublié ?' : 'Retour à la connexion'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
