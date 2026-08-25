import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { checkAdminMembership, AdminCheck } from '../lib/adminAuth';
import type { User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  adminCheck: AdminCheck | null;
  isLoading: boolean;
  isVerifying: boolean;
  verificationError: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; check?: AdminCheck }>;
  signOut: () => Promise<void>;
  retryAdminCheck: () => Promise<AdminCheck>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Stale check prevention: sequence token & unmount tracker
  const checkSeqRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  /**
   * Verified helper to check admin membership using public.admin_users table via RLS.
   * Enforces that:
   * - kind === 'admin' => isAdmin: true, user stays signed in.
   * - kind === 'not_admin' => confirmed non-admin; signOut() executed.
   * - kind === 'error' => network/query failure; user KEPT signed in, error exposed for retry.
   */
  const verifyAdmin = useCallback(async (targetUser: User): Promise<AdminCheck> => {
    const currentSeq = ++checkSeqRef.current;
    setIsVerifying(true);

    const checkResult = await checkAdminMembership(targetUser.id);

    // If unmounted or a newer check was triggered while waiting, ignore stale response
    if (!isMountedRef.current || currentSeq !== checkSeqRef.current) {
      return checkResult;
    }

    if (checkResult.kind === 'admin') {
      setUser(targetUser);
      setIsAdmin(true);
      setAdminCheck(checkResult);
      setVerificationError(null);
      setIsVerifying(false);
    } else if (checkResult.kind === 'not_admin') {
      // Confirmed non-admin: must sign out
      setAdminCheck(checkResult);
      setIsAdmin(false);
      setUser(null);
      setVerificationError(null);
      setIsVerifying(false);
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Sign out error for confirmed non-admin:', err);
      }
    } else if (checkResult.kind === 'error') {
      // Network or DB error: CRITICAL - Keep user signed in, record retryable error
      setUser(targetUser);
      setIsAdmin(false);
      setAdminCheck(checkResult);
      setVerificationError(checkResult.message);
      setIsVerifying(false);
    }

    return checkResult;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    async function initAuth() {
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        if (sessionError) {
          console.warn('Error fetching session:', sessionError.message);
          setUser(null);
          setIsAdmin(false);
          setAdminCheck(null);
          setVerificationError(null);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await verifyAdmin(session.user);
        } else {
          setUser(null);
          setIsAdmin(false);
          setAdminCheck(null);
          setVerificationError(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      if (event === 'SIGNED_OUT' || !session) {
        // Invalidate any pending in-flight async check
        checkSeqRef.current++;
        setUser(null);
        setIsAdmin(false);
        setAdminCheck(null);
        setVerificationError(null);
        setIsLoading(false);
        setIsVerifying(false);
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setUser(session.user);
        await verifyAdmin(session.user);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      checkSeqRef.current++;
      authListener?.subscription.unsubscribe();
    };
  }, [verifyAdmin]);

  const retryAdminCheck = useCallback(async (): Promise<AdminCheck> => {
    let targetUser = user;
    if (!targetUser) {
      const { data: { session } } = await supabase.auth.getSession();
      targetUser = session?.user || null;
    }

    if (!targetUser) {
      const notLoggedIn: AdminCheck = { kind: 'not_admin' };
      setAdminCheck(notLoggedIn);
      setIsAdmin(false);
      setVerificationError('No active authentication session found. Please sign in.');
      return notLoggedIn;
    }

    return await verifyAdmin(targetUser);
  }, [user, verifyAdmin]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; check?: AdminCheck }> => {
    try {
      setIsLoading(true);
      setVerificationError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        setIsLoading(false);
        return { success: false, error: 'User account not found.' };
      }

      // Check admin membership using public.admin_users
      const check = await verifyAdmin(data.user);
      setIsLoading(false);

      if (check.kind === 'admin') {
        return { success: true, check };
      }

      if (check.kind === 'not_admin') {
        return {
          success: false,
          error: 'This account does not have administrative privileges for Giriraj Product Manager.',
          check,
        };
      }

      // kind === 'error'
      return {
        success: false,
        error: `Admin membership verification encountered a network or service error: ${check.message}. Session is active; please retry verification.`,
        check,
      };
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      checkSeqRef.current++;
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setAdminCheck(null);
      setVerificationError(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        adminCheck,
        isLoading,
        isVerifying,
        verificationError,
        signIn,
        signOut,
        retryAdminCheck,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
