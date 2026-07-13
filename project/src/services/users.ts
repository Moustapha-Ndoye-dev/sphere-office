import { supabase } from '../lib/supabase';

export type ManagedUserRole = 'superadmin' | 'admin' | 'cashier';

export interface UserData {
  email: string;
  password: string;
  role: ManagedUserRole;
}

export interface ManagedUser {
  id: string;
  profileId: string | null;
  email: string;
  role: ManagedUserRole;
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Session admin introuvable');
  }

  return session.access_token;
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });

  const responseText = await response.text();
  let payload: ({ error?: string; details?: string } & T) | null = null;

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as ({ error?: string; details?: string } & T);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session admin invalide ou expiree');
    }

    if (response.status === 403) {
      throw new Error('Acces reserve aux super administrateurs');
    }

    if (response.status === 404) {
      throw new Error('API utilisateurs introuvable en local. Verifiez le serveur de developpement.');
    }

    if (response.status === 409) {
      throw new Error(payload?.error || 'Operation impossible a cause d un conflit de donnees');
    }

    const serverMessage = payload?.error || payload?.details || `Erreur serveur (${response.status})`;
    if (serverMessage.toLowerCase().includes('configuration')) {
      throw new Error('La configuration serveur est incomplete. Contactez l administrateur technique.');
    }
    throw new Error(serverMessage);
  }

  if (!payload) {
    throw new Error('Reponse serveur invalide');
  }

  return payload;
}

export async function createUser(userData: UserData) {
  return apiRequest<ManagedUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

export async function updateUser(userId: string, userData: { password?: string; role?: ManagedUserRole }) {
  return apiRequest<ManagedUser & { success?: boolean }>(`/api/users?id=${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
}

export async function getUsers() {
  try {
    return await apiRequest<ManagedUser[]>('/api/users', {
      method: 'GET',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const canFallbackToProfiles =
      message.includes('configuration serveur') ||
      message.includes('clé serveur Supabase manque') ||
      message.includes('API utilisateurs introuvable') ||
      message.includes('Erreur serveur');

    if (!canFallbackToProfiles) {
      throw error;
    }

    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select('id_profiles, login, role, user_id')
      .order('login');

    if (profilesError) throw profilesError;

    return (data || [])
      .filter((profile) => profile.role === 'superadmin' || profile.role === 'admin' || profile.role === 'cashier')
      .map((profile) => ({
        id: profile.user_id || profile.id_profiles,
        profileId: profile.id_profiles,
        email: profile.login,
        role: profile.role,
      })) as ManagedUser[];
  }
}

export async function deleteUser(userId: string) {
  return apiRequest<{ success: boolean }>(`/api/users?id=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}
