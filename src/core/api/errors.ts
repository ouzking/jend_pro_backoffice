/**
 * Transport-agnostic error contract. The backend raises stable machine codes
 * (docs/business-rules.md §13 of jend_pro_backend); repositories convert any
 * transport error (PostgREST today, Laravel tomorrow) into an ApiError.
 */
export type ApiErrorKind = 'auth' | 'forbidden' | 'not_found' | 'validation' | 'conflict' | 'network' | 'unknown'

export class ApiError extends Error {
  readonly code: string
  readonly kind: ApiErrorKind
  readonly detail?: string

  constructor(code: string, kind: ApiErrorKind, message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.kind = kind
    this.detail = detail
  }
}

const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
  PERMISSION_DENIED: 'Vous n’avez pas la permission d’effectuer cette action.',
  BUSINESS_NOT_FOUND: 'Entreprise introuvable.',
  USER_NOT_FOUND: 'Aucun compte ne correspond.',
  TICKET_NOT_FOUND: 'Ticket introuvable.',
  ADMIN_NOT_FOUND: 'Administrateur introuvable.',
  PLAN_NOT_FOUND: 'Plan introuvable.',
  ROLE_NOT_FOUND: 'Rôle introuvable.',
  REASON_REQUIRED: 'Indiquez un motif (3 caractères minimum).',
  REFERENCE_REQUIRED: 'Indiquez une référence de paiement (3 caractères minimum).',
  AMOUNT_MISMATCH: 'Le montant ne couvre pas le prix du plan pour la durée choisie.',
  INVALID_PERIOD: 'La durée doit être comprise entre 1 et 36 mois.',
  INVALID_DATE_RANGE: 'La période sélectionnée est invalide.',
  DATE_RANGE_TOO_LARGE: 'La période ne peut pas dépasser 366 jours.',
  INVALID_SORT: 'Tri non pris en charge.',
  INVALID_GRANULARITY: 'Granularité non prise en charge.',
  LAST_SUPER_ADMIN: 'La plateforme doit conserver au moins un super administrateur actif.',
  CANNOT_CHANGE_SELF: 'Vous ne pouvez pas modifier votre propre accès.',
  INVALID_ASSIGNEE: 'Ce membre de l’équipe ne peut pas traiter les tickets.',
  TICKET_CLOSED: 'Ce ticket est fermé.',
  ANNOUNCEMENT_NOT_EDITABLE: 'Cette annonce a déjà été envoyée et ne peut plus être modifiée.',
  AUDIENCE_VALUE_REQUIRED: 'Précisez la cible de l’annonce.',
  RATE_LIMITED: 'Trop de demandes. Réessayez plus tard.',
  MFA_REQUIRED: 'Action sensible : validez votre identité avec la double authentification (Paramètres › Mon compte).',
  NETWORK_ERROR: 'Connexion impossible. Vérifiez votre réseau puis réessayez.',
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
}

const KIND_BY_SQLSTATE: Record<string, ApiErrorKind> = {
  '42501': 'forbidden',
  P0002: 'not_found',
  '22023': 'validation',
  '23514': 'validation',
  '23505': 'conflict',
  P0001: 'conflict',
}

export function messageFor(code: string): string | undefined {
  return MESSAGES[code]
}

interface PostgrestLikeError {
  message?: unknown
  code?: unknown
  details?: unknown
  status?: unknown
}

/** Normalizes anything thrown by a transport into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return new ApiError('NETWORK_ERROR', 'network', MESSAGES.NETWORK_ERROR)
  }

  if (typeof error === 'object' && error !== null) {
    const e = error as PostgrestLikeError
    const rawMessage = typeof e.message === 'string' ? e.message : ''
    const sqlState = typeof e.code === 'string' ? e.code : ''
    const detail = typeof e.details === 'string' ? e.details : undefined

    // Backend business errors: message is a stable UPPER_SNAKE code.
    if (/^[A-Z][A-Z0-9_]+$/.test(rawMessage)) {
      const kind = rawMessage === 'NOT_AUTHENTICATED' ? 'auth' : (KIND_BY_SQLSTATE[sqlState] ?? 'unknown')
      return new ApiError(rawMessage, kind, MESSAGES[rawMessage] ?? 'Une erreur est survenue.', detail)
    }
    if (sqlState === 'PGRST301' || /jwt/i.test(rawMessage)) {
      return new ApiError('NOT_AUTHENTICATED', 'auth', MESSAGES.NOT_AUTHENTICATED)
    }
    if (sqlState in KIND_BY_SQLSTATE) {
      return new ApiError(sqlState, KIND_BY_SQLSTATE[sqlState], rawMessage || 'Une erreur est survenue.', detail)
    }
    if (/failed to fetch|network/i.test(rawMessage)) {
      return new ApiError('NETWORK_ERROR', 'network', MESSAGES.NETWORK_ERROR)
    }
    if (rawMessage) return new ApiError('UNKNOWN', 'unknown', rawMessage, detail)
  }
  return new ApiError('UNKNOWN', 'unknown', 'Une erreur inattendue est survenue.')
}

/** Unwraps a { data, error } transport result, throwing an ApiError on failure. */
export function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw toApiError(result.error)
  return result.data
}
