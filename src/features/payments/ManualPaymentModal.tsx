import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Overlay'
import { useToast } from '@/components/ui/Toast'
import { toApiError } from '@/core/api/errors'
import { BILLING_PERIOD } from '@/core/config/domain'
import { formatDate, formatMoney } from '@/core/utils/format'
import { BusinessPicker, type PickedBusiness } from '@/features/businesses/BusinessPicker'
import { usePlans } from '@/features/subscriptions/api'
import { planPricing } from '@/features/subscriptions/subscriptions.repository'
import { useRecordManualPayment } from './api'

/**
 * Offline payment (cash, transfer, invoice) confirmed by finance. The backend
 * applies the webhook rules: amount >= price × months, one reference = one
 * payment (idempotent), renewal extends the current period.
 */
export function ManualPaymentModal({ open, onClose, business }: { open: boolean; onClose: () => void; business?: PickedBusiness }) {
  // Mounted only while open: every opening starts from a clean form.
  return open ? <ManualPaymentDialog key={business?.id ?? 'any'} onClose={onClose} business={business} /> : null
}

function ManualPaymentDialog({ onClose, business }: { onClose: () => void; business?: PickedBusiness }) {
  const toast = useToast()
  const plans = usePlans()
  const mutation = useRecordManualPayment()
  const [picked, setPicked] = useState<PickedBusiness | null>(business ?? null)
  const [planCode, setPlanCode] = useState('')
  const [months, setMonths] = useState(1)
  /** null = follow the expected amount (price × months) until the user types. */
  const [amountInput, setAmountInput] = useState<string | null>(null)
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only paid catalog plans can be bought (custom-priced plans are invoiced: amount > 0 entered manually).
  const plan = plans.data?.find((p) => p.code === planCode)
  const expected = plan ? plan.priceAmount * months : null
  const amount = amountInput ?? (expected ? String(expected) : '')
  const amountValue = Number(amount.replace(/\s/g, ''))
  const amountValid = Number.isInteger(amountValue) && amountValue > 0 && (expected === null || amountValue >= expected)
  const valid = Boolean(picked && plan && months >= 1 && months <= 36 && amountValid && reference.trim().length >= 3)

  // Free plans cannot be paid for; custom-quote plans take the agreed amount.
  const planOptions = useMemo(
    () =>
      (plans.data ?? [])
        .filter((p) => planPricing(p) !== 'free')
        .map((p) => ({
          value: p.code,
          label: `${p.name} — ${planPricing(p) === 'paid' ? `${formatMoney(p.priceAmount)} / ${BILLING_PERIOD[p.billingPeriod]}` : 'sur devis'}`,
        })),
    [plans.data],
  )

  const submit = async () => {
    if (!picked || !plan) return
    setError(null)
    try {
      const result = await mutation.mutateAsync({
        businessId: picked.id,
        planCode: plan.code,
        months,
        amount: amountValue,
        reference: reference.trim(),
        note: note.trim() || undefined,
      })
      if (result.duplicate) {
        toast.info('Paiement déjà enregistré', `La référence ${reference.trim()} a déjà été traitée : rien n’a été modifié.`)
      } else {
        toast.success('Paiement enregistré', `${picked.name} — ${plan.name} actif jusqu’au ${formatDate(result.currentPeriodEnd)}.`)
      }
      onClose()
    } catch (e) {
      setError(toApiError(e).message)
      setConfirming(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!mutation.isPending}
      title={confirming ? 'Confirmer le paiement' : 'Enregistrer un paiement manuel'}
      description={confirming ? undefined : 'Espèces, virement ou facture : active ou prolonge l’abonnement selon les règles de facturation.'}
      footer={
        confirming ? (
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={mutation.isPending}>
              Modifier
            </Button>
            <Button variant="primary" loading={mutation.isPending} onClick={submit} leftIcon={<CheckCircle2 className="size-4" />}>
              Confirmer l’enregistrement
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button variant="primary" disabled={!valid} onClick={() => setConfirming(true)}>
              Vérifier
            </Button>
          </>
        )
      }
    >
      {confirming && picked && plan ? (
        <div className="space-y-4">
          <dl className="divide-y divide-border rounded-xl border border-border text-sm">
            {[
              ['Entreprise', picked.name],
              ['Plan', plan.name],
              ['Durée', `${months} mois`],
              ['Montant', formatMoney(amountValue)],
              ['Référence', reference.trim()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-fg-muted">{k}</dt>
                <dd className="font-semibold text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Action enregistrée dans le journal d’audit avec votre nom. Une même référence n’est jamais traitée deux fois.
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!business && (
            <Field label="Entreprise" required className="sm:col-span-2">
              <BusinessPicker value={picked} onChange={setPicked} />
            </Field>
          )}
          <Field label="Plan" required className="sm:col-span-2">
            <Select
              value={planCode}
              onValueChange={(v) => {
                setPlanCode(v)
                setAmountInput(null)
              }}
              options={planOptions}
              placeholder="Choisir un plan"
            />
          </Field>
          <Field label="Durée (mois)" required hint="1 à 36 mois">
            <Input
              type="number"
              min={1}
              max={36}
              value={months}
              onChange={(e) => {
                setMonths(Math.min(36, Math.max(1, Number(e.target.value) || 1)))
                setAmountInput(null)
              }}
            />
          </Field>
          <Field
            label="Montant reçu (FCFA)"
            required
            error={amount && !amountValid ? (expected ? `Au moins ${formatMoney(expected)} pour ${months} mois.` : 'Montant invalide.') : null}
            hint={expected ? `Attendu : ${formatMoney(expected)}` : plan && plan.priceAmount === 0 ? 'Plan sur devis : montant convenu.' : undefined}
          >
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmountInput(e.target.value.replace(/[^\d\s]/g, ''))} />
          </Field>
          <Field label="Référence du paiement" required hint="N° de virement, de reçu ou de facture (unique)." className="sm:col-span-2">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder="VIR-2026-0042" />
          </Field>
          <Field label="Note interne" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Facultatif — visible dans le journal d’audit"
            />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger sm:col-span-2">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
