import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore, type UserRole } from '../store/auth';

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT';

function normalizeRole(role: unknown): UserRole {
  if (role === 'superadmin' || role === 'admin' || role === 'cashier') {
    return role;
  }

  throw new Error('Role staff invalide');
}

async function fetchRole(userId: string): Promise<UserRole> {
  // Cache hit — skip DB query entirely
  // First try exact match by user_id
  const { data: byId } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (byId?.role) {
    return normalizeRole(byId.role);
  }

  // Fallback: match by email (legacy profiles with user_id = null)
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) throw new Error('Session staff sans adresse e-mail');

  const { data: byEmail } = await supabase
    .from('profiles')
    .select('role')
    .eq('login', email)
    .maybeSingle();

  if (byEmail?.role) {
    return normalizeRole(byEmail.role);
  }

  throw new Error('Profil staff introuvable');
}

async function setUserFromSession(session: Session | null) {
  if (!session?.user) {
    useAuthStore.getState().setUser(null);
    return false;
  }

  const role = await fetchRole(session.user.id);
  useAuthStore.getState().setUser({
    id: session.user.id,
    email: session.user.email || '',
    role,
  });

  return true;
}

export async function checkSession() {
  useAuthStore.getState().setAuthLoading(true);
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return await setUserFromSession(session);
  } catch (error) {
    console.error('Erreur lors de la verification de session:', error);
    useAuthStore.getState().setUser(null);
    return false;
  } finally {
    useAuthStore.getState().setAuthLoading(false);
  }
}

export function onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      useAuthStore.getState().setAuthLoading(true);
      try {
        const hasUser = await setUserFromSession(session);
        callback(hasUser ? 'SIGNED_IN' : 'SIGNED_OUT', session);
      } catch (error) {
        console.error('Erreur role/session:', error);
        useAuthStore.getState().setUser(null);
        callback('SIGNED_OUT', null);
      } finally {
        useAuthStore.getState().setAuthLoading(false);
      }
      return;
    }

    if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null);
      useAuthStore.getState().setAuthLoading(false);
      callback('SIGNED_OUT', null);
    }
  });

  return {
    unsubscribe: () => data.subscription.unsubscribe(),
  };
}
