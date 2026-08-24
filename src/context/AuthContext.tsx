import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkAdminStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check is_admin RPC on Supabase
  const checkAdminStatus = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) {
        console.warn('is_admin RPC returned error:', error.message);
        // If RPC function fails or table is inaccessible, check if user exists in admin_users or return false
        return false;
      }
      return Boolean(data);
    } catch (err) {
      console.error('Error invoking is_admin RPC:', err);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          const admin = await checkAdminStatus();
          if (mounted) {
            if (admin) {
              setIsAdmin(true);
            } else {
              // Not admin
              setIsAdmin(false);
              await supabase.auth.signOut();
              setUser(null);
            }
          }
        } else if (mounted) {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setUser(session.user);
        const admin = await checkAdminStatus();
        if (mounted) {
          if (admin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
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

      // Check admin status
      const admin = await checkAdminStatus();
      if (!admin) {
        // Sign out immediately
        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setIsLoading(false);
        return {
          success: false,
          error: 'This account does not have admin access.',
        };
      }

      setUser(data.user);
      setIsAdmin(true);
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        signIn,
        signOut,
        checkAdminStatus,
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
