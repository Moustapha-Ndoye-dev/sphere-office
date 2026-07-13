import { useAuthStore } from '../store/auth';
import { supabase } from './supabase';
import { checkSession as checkSessionSupabase } from './auth.supabase';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Aucun utilisateur trouve');
  }

  await checkSessionSupabase();
  const user = useAuthStore.getState().user;

  if (!user) {
    throw new Error('Impossible de charger le profil utilisateur');
  }

  return { user };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }

  localStorage.removeItem('auth-storage');
  localStorage.removeItem('sphere-user-role');
  sessionStorage.removeItem('csrf_token');
  useAuthStore.getState().setUser(null);
  window.location.href = '/admin/login';
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const email = session?.user.email;
  if (!email) {
    throw new Error('Session utilisateur invalide ou expiree');
  }

  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (verificationError) {
    throw new Error('Le mot de passe actuel est incorrect');
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    if (error.message.toLowerCase().includes('current password')) {
      throw new Error('Le mot de passe actuel est incorrect');
    }
    throw new Error('Impossible de modifier le mot de passe pour le moment');
  }
}
