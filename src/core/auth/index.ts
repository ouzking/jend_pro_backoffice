import { supabase } from '@/core/api/supabase'
import { createSupabaseAuthRepository } from './auth.supabase'

/** Swap point for V2 (Laravel): replace the implementation here. */
export const authRepository = createSupabaseAuthRepository(supabase)

export type { AuthRepository, AuthUser } from './auth.repository'
export { AuthProvider, useAuth } from './AuthProvider'
