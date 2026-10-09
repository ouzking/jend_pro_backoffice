import type { Tone } from '@/core/config/domain'

/**
 * Readable labels of the audit catalog (jend_pro_backend docs/database.md §4.3
 * + Phase 16 platform actions). Unknown actions fall back to their code.
 */
const ACTION_LABELS: Record<string, string> = {
  'business.create': 'Entreprise créée',
  'business.update': 'Paramètres de l’entreprise modifiés',
  'business.status_change': 'Statut de l’entreprise modifié',
  'location.create': 'Emplacement créé',
  'location.update': 'Emplacement modifié',
  'location.status_change': 'Statut d’emplacement modifié',
  'member.invite': 'Membre invité',
  'member.join': 'Invitation acceptée',
  'member.decline': 'Invitation refusée',
  'member.role_change': 'Rôle d’un membre modifié',
  'member.status_change': 'Statut d’un membre modifié',
  'member.remove': 'Membre retiré',
  'member.leave': 'Membre parti',
  'product.create': 'Produit créé',
  'product.price_change': 'Prix modifié',
  'product.cost_change': 'Coût modifié',
  'product.status_change': 'Produit archivé / réactivé',
  'customer.credit_limit_change': 'Plafond de crédit modifié',
  'customer.payment': 'Règlement client',
  'customer.balance_adjust': 'Solde client ajusté',
  'customer.status_change': 'Client archivé / réactivé',
  'supplier.status_change': 'Fournisseur archivé / réactivé',
  'purchase.receive': 'Achat réceptionné',
  'purchase.payment': 'Paiement fournisseur',
  'purchase.cancel': 'Achat annulé',
  'inventory.adjust': 'Stock ajusté',
  'inventory.count': 'Inventaire physique',
  'inventory.transfer': 'Transfert de stock',
  'sale.cancel': 'Vente annulée',
  'sale.discount': 'Remise accordée',
  'expense.create': 'Dépense créée',
  'expense.update': 'Dépense modifiée',
  'expense.delete': 'Dépense supprimée',
  'employee.salary_change': 'Salaire modifié',
  'subscription.change': 'Abonnement modifié',
  'billing.manual_payment': 'Paiement manuel enregistré',
  'platform_admin.grant': 'Rôle plateforme attribué',
  'platform_admin.status_change': 'Statut d’un administrateur modifié',
  'support.ticket_update': 'Ticket mis à jour',
  'announcement.send': 'Annonce envoyée',
}

/** Domains for the filter (prefix match on the backend). */
export const ACTION_DOMAINS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'business', label: 'Entreprise' },
  { value: 'member', label: 'Membres' },
  { value: 'location', label: 'Emplacements' },
  { value: 'product', label: 'Catalogue' },
  { value: 'inventory', label: 'Stock' },
  { value: 'sale', label: 'Ventes' },
  { value: 'customer', label: 'Clients' },
  { value: 'supplier', label: 'Fournisseurs' },
  { value: 'purchase', label: 'Achats' },
  { value: 'expense', label: 'Dépenses' },
  { value: 'employee', label: 'Employés' },
  { value: 'subscription', label: 'Abonnements' },
  { value: 'billing', label: 'Facturation' },
  { value: 'support', label: 'Support' },
  { value: 'announcement', label: 'Annonces' },
  { value: 'platform_admin', label: 'Équipe plateforme' },
]

export function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  const [domain, verb] = action.split('.')
  const domainLabel = ACTION_DOMAINS.find((d) => d.value === domain)?.label ?? domain
  return `${domainLabel} · ${verb?.replace(/_/g, ' ') ?? ''}`.trim()
}

/** Visual weight of an action in the journal. */
export function actionTone(action: string): Tone {
  if (/status_change|remove|cancel|delete|suspend/.test(action)) return 'danger'
  if (/^(billing|subscription)\./.test(action)) return 'success'
  if (/^(platform_admin|announcement|support)\./.test(action)) return 'accent'
  if (/price|cost|salary|role_change|credit_limit|balance/.test(action)) return 'warning'
  return 'neutral'
}

export function actorRoleLabel(role: string | null): string {
  if (role === 'service_role') return 'Système (serveur)'
  if (role === 'postgres') return 'Système (maintenance)'
  if (role === 'authenticated') return 'Utilisateur'
  return role ?? '—'
}
