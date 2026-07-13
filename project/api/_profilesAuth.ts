import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export type ProfileRole = 'superadmin' | 'admin' | 'cashier';

export interface ProfileRecord {
  id_profiles: string;
  login: string;
  mdp?: string | null;
  role: ProfileRole;
  user_id: string | null;
  created_at?: string;
  updated_at?: string;
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(
      name === 'SUPABASE_SERVICE_ROLE_KEY'
        ? 'SUPABASE_SERVICE_ROLE_KEY is missing. User creation and deletion require this server-only key.'
        : `${name} is missing`
    );
  }

  return value;
}

export function createAdminClient() {
  return createClient(
    assertEnv(SUPABASE_URL, 'SUPABASE_URL'),
    assertEnv(SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function resolveRequesterProfile(adminClient: SupabaseClient, accessToken: string) {
  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const { data: profilesByUserId, error: profileByUserIdError } = await adminClient
    .from('profiles')
    .select('role, login, user_id, updated_at, created_at')
    .eq('user_id', user.id);

  if (profileByUserIdError) {
    throw profileByUserIdError;
  }

  let profile = profilesByUserId?.[0] || null;

  if (!profile && user.email) {
    const { data: profilesByLogin, error: profileByLoginError } = await adminClient
      .from('profiles')
      .select('role, login, user_id, updated_at, created_at')
      .eq('login', user.email)
      .is('user_id', null);

    if (profileByLoginError) {
      throw profileByLoginError;
    }

    profile = profilesByLogin?.[0] || null;
  }

  if (!profile) {
    throw new Error('Forbidden');
  }

  if (user.email && !profile.user_id && profile.login === user.email) {
    await adminClient
      .from('profiles')
      .update({ user_id: user.id })
      .eq('login', user.email);
  }

  if (profile.role !== 'superadmin' && profile.role !== 'admin' && profile.role !== 'cashier') {
    throw new Error('Forbidden');
  }

  return {
    user,
    role: profile.role,
  };
}

export async function assertRequesterIsSuperAdmin(adminClient: SupabaseClient, accessToken: string) {
  const requester = await resolveRequesterProfile(adminClient, accessToken);

  if (requester.role !== 'superadmin') {
    throw new Error('Forbidden');
  }

  return requester.user;
}

export async function ensureProfile(
  adminClient: SupabaseClient,
  user: User,
  role: ProfileRole,
  passwordPlaceholder = 'managed_by_supabase_auth'
) {
  const profilePayload = {
    user_id: user.id,
    login: user.email,
    role,
    mdp: passwordPlaceholder,
  };

  const { data: existingMatches } = await adminClient
    .from('profiles')
    .select('id_profiles, login, user_id')
    .or(`user_id.eq.${user.id},login.eq.${user.email}`);

  if (existingMatches && existingMatches.length > 0) {
    const { error: updateByUserIdError } = await adminClient.from('profiles').update(profilePayload).eq('user_id', user.id);
    if (updateByUserIdError) {
      throw updateByUserIdError;
    }

    if (user.email) {
      const { error: updateByLoginError } = await adminClient.from('profiles').update(profilePayload).eq('login', user.email);
      if (updateByLoginError) {
        throw updateByLoginError;
      }
    }
    return;
  }

  const { error } = await adminClient.from('profiles').insert(profilePayload);
  if (error) {
    throw error;
  }
}
