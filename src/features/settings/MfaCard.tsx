import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CodeInput } from '@/components/ui/CodeInput'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Overlay'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { toApiError } from '@/core/api/errors'
import type { TotpEnrollment } from '@/core/auth/auth.repository'
import { useAuth } from '@/core/auth'
import { formatDate } from '@/core/utils/format'

function EnrollModal({ onClose }: { onClose: () => void }) {
  const { mfa } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const enrollment = useQuery<TotpEnrollment>({
    queryKey: ['mfa', 'enroll'],
    queryFn: () => mfa.enroll('Console JËND PRO'),
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
  })
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async (value = code) => {
    if (!enrollment.data || value.length !== 6 || pending) return
    setPending(true)
    setError(null)
    try {
      await mfa.verifyEnrollment(enrollment.data.factorId, value)
      await queryClient.invalidateQueries({ queryKey: ['mfa', 'factors'] })
      toast.success('Double authentification activée', 'Elle sera demandée à chaque connexion.')
      onClose()
    } catch (e) {
      setError(toApiError(e).message)
      setCode('')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!pending}
      title="Activer la double authentification"
      description="Avec Google Authenticator, Microsoft Authenticator, Authy ou 1Password."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button variant="primary" loading={pending} disabled={code.length !== 6 || !enrollment.data} onClick={() => void verify()}>
            Activer
          </Button>
        </>
      }
    >
      {enrollment.isPending ? (
        <Skeleton className="mx-auto size-48 rounded-xl" />
      ) : enrollment.isError ? (
        <ErrorState error={enrollment.error} onRetry={() => void enrollment.refetch()} compact />
      ) : (
        <ol className="space-y-5 text-[13px] text-fg-muted">
          <li>
            <p className="font-semibold text-fg">1. Scannez ce QR code avec votre application</p>
            <div className="mt-3 flex justify-center rounded-xl border border-border bg-white p-3">
              <img src={enrollment.data.qrCode} alt="QR code d’activation de la double authentification" className="size-44" />
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs">
              <span>Ou saisissez la clé :</span>
              <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-fg">{enrollment.data.secret}</code>
              <button
                type="button"
                className="text-fg-subtle hover:text-fg"
                aria-label="Copier la clé"
                onClick={() => void navigator.clipboard?.writeText(enrollment.data.secret).then(() => toast.info('Clé copiée'))}
              >
                <Copy className="size-3.5" />
              </button>
            </div>
          </li>
          <li>
            <p className="mb-2 font-semibold text-fg">2. Saisissez le code à 6 chiffres affiché</p>
            <CodeInput
              value={code}
              onValueChange={setCode}
              onComplete={(c) => void verify(c)}
              aria-label="Code à 6 chiffres"
              aria-invalid={Boolean(error)}
              data-autofocus
            />
            {error && (
              <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
                {error}
              </p>
            )}
          </li>
        </ol>
      )}
    </Modal>
  )
}

/** Settings › Mon compte: second factor management. */
export function MfaCard() {
  const { mfa, access } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const factors = useQuery({ queryKey: ['mfa', 'factors'], queryFn: () => mfa.listFactors() })
  const [enrolling, setEnrolling] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const verified = factors.data?.filter((f) => f.status === 'verified') ?? []
  const sensitive = access ? [...access.mfaPermissions].filter((p) => access.permissions.has(p)).length : 0

  return (
    <Card>
      <CardHeader
        title="Double authentification"
        icon={<ShieldCheck />}
        actions={
          verified.length > 0 ? (
            <Badge tone="success" dot>
              Activée
            </Badge>
          ) : (
            <Badge tone="warning" dot>
              Désactivée
            </Badge>
          )
        }
      />
      <CardBody className="space-y-4 text-[13px] text-fg-muted">
        {factors.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : factors.isError ? (
          <ErrorState error={factors.error} onRetry={() => void factors.refetch()} compact />
        ) : verified.length === 0 ? (
          <>
            <p>
              Protégez votre compte avec un code temporaire généré sur votre téléphone.
              {sensitive > 0 && <span className="font-semibold text-fg"> Obligatoire pour vos {sensitive} action(s) sensible(s)</span>}
              {sensitive > 0 && ' (suspension, paiements, équipe, annonces).'}
            </p>
            <Button variant="primary" size="sm" leftIcon={<Smartphone className="size-4" />} onClick={() => setEnrolling(true)}>
              Activer la double authentification
            </Button>
          </>
        ) : (
          <>
            <p>Un code vous est demandé à chaque connexion. Toutes les actions de la console sont accessibles.</p>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {verified.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                  <KeyRound className="size-4 text-brand-600 dark:text-mint" />
                  <span className="flex-1">
                    <span className="block font-semibold text-fg">{f.friendlyName ?? 'Application d’authentification'}</span>
                    <span className="text-xs text-fg-subtle">Ajoutée le {formatDate(f.createdAt)}</span>
                  </span>
                  <Button size="xs" variant="ghost" leftIcon={<ShieldOff className="size-3.5" />} onClick={() => setRemoving(f.id)}>
                    Désactiver
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
      {enrolling && <EnrollModal onClose={() => setEnrolling(false)} />}
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Désactiver la double authentification ?"
        description="Votre compte ne sera plus protégé par un second facteur, et les actions sensibles redeviendront inaccessibles tant que vous ne l’aurez pas réactivée."
        confirmLabel="Désactiver"
        onConfirm={async () => {
          if (!removing) return
          await mfa.unenroll(removing)
          await queryClient.invalidateQueries({ queryKey: ['mfa', 'factors'] })
          toast.success('Double authentification désactivée')
        }}
      />
    </Card>
  )
}
