import { supabase } from './supabaseClient';

export type AdminCheck =
  | { kind: 'admin' }
  | { kind: 'not_admin' }
  | { kind: 'error'; message: string };

/**
 * Checks if a user is an admin by querying public.admin_users through RLS.
 * 
 * Contract:
 * - Authenticated users can SELECT only their own public.admin_users row.
 * - Row returned => admin ({ kind: 'admin' })
 * - No row returned => confirmed non-admin ({ kind: 'not_admin' })
 * - Error => network or query failure ({ kind: 'error', message })
 *   CRITICAL: Error does NOT mean non-admin.
 */
export async function checkAdminMembership(userId: string): Promise<AdminCheck> {
  if (!userId) {
    return { kind: 'not_admin' };
  }

  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { kind: 'error', message: error.message };
    }

    return data ? { kind: 'admin' } : { kind: 'not_admin' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network or execution error while checking admin membership';
    return { kind: 'error', message };
  }
}

/**
 * Pure state and transition definitions for admin verification.
 * Used by AuthContext and unit tests to ensure strict adherence to security contracts.
 */
export interface AuthAdminState<TUser = unknown> {
  user: TUser | null;
  isAdmin: boolean;
  adminCheck: AdminCheck | null;
  verificationError: string | null;
  isVerifying: boolean;
}

export type AuthAdminAction<TUser = unknown> =
  | { type: 'START_CHECK' }
  | { type: 'CHECK_RESOLVED'; check: AdminCheck; user: TUser }
  | { type: 'AUTH_SIGNED_OUT' }
  | { type: 'CLEAR_ERROR' };

export function authAdminReducer<TUser>(
  state: AuthAdminState<TUser>,
  action: AuthAdminAction<TUser>
): { nextState: AuthAdminState<TUser>; shouldSignOut: boolean } {
  switch (action.type) {
    case 'START_CHECK':
      return {
        nextState: {
          ...state,
          isVerifying: true,
        },
        shouldSignOut: false,
      };

    case 'CHECK_RESOLVED': {
      const { check, user } = action;

      if (check.kind === 'admin') {
        return {
          nextState: {
            user,
            isAdmin: true,
            adminCheck: check,
            verificationError: null,
            isVerifying: false,
          },
          shouldSignOut: false,
        };
      }

      if (check.kind === 'not_admin') {
        // Confirmed not an admin -> must sign out
        return {
          nextState: {
            user: null,
            isAdmin: false,
            adminCheck: check,
            verificationError: null,
            isVerifying: false,
          },
          shouldSignOut: true,
        };
      }

      if (check.kind === 'error') {
        // Network / Supabase error:
        // CRITICAL: DO NOT SIGN OUT USER. Keep user signed in, record error for retry.
        return {
          nextState: {
            user, // User remains signed in
            isAdmin: false, // Access not granted yet until verified
            adminCheck: check,
            verificationError: check.message,
            isVerifying: false,
          },
          shouldSignOut: false, // Never sign out on error
        };
      }

      return { nextState: state, shouldSignOut: false };
    }

    case 'AUTH_SIGNED_OUT':
      return {
        nextState: {
          user: null,
          isAdmin: false,
          adminCheck: null,
          verificationError: null,
          isVerifying: false,
        },
        shouldSignOut: false,
      };

    case 'CLEAR_ERROR':
      return {
        nextState: {
          ...state,
          verificationError: null,
        },
        shouldSignOut: false,
      };

    default:
      return { nextState: state, shouldSignOut: false };
  }
}
