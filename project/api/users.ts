import type { User } from '@supabase/supabase-js';
import {
  assertRequesterIsSuperAdmin,
  createAdminClient,
  ensureProfile,
  type ProfileRole,
  type ProfileRecord,
} from './_profilesAuth.ts';
import { applyApiCorsHeaders, applyApiSecurityHeaders } from './_httpSecurity.ts';

type ApiRequest = {
  method?: string;
  headers: {
    authorization?: string;
    origin?: string | string[];
    host?: string | string[];
    'x-forwarded-host'?: string | string[];
    'x-forwarded-proto'?: string | string[];
  };
  body?: unknown;
  query?: {
    id?: string | string[];
  };
};

type ApiResponse = {
  setHeader: (name: string, value: string | string[]) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
};

type CreateUserBody = {
  email: string;
  password: string;
  role: ProfileRole;
};

type UpdateUserBody = {
  password?: string;
  role?: ProfileRole;
};

type ManagedUserResponse = {
  id: string;
  profileId: string | null;
  email: string;
  role: ProfileRole;
};

function isStrongPassword(password: string) {
  return password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

function getBearerToken(request: ApiRequest) {
  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ') || authorization.length > 4096) {
    throw new Error('Unauthorized');
  }

  const accessToken = authorization.slice('Bearer '.length).trim();
  if (!accessToken || /\s/.test(accessToken)) {
    throw new Error('Unauthorized');
  }

  return accessToken;
}

function parseCreateUserBody(body: unknown): CreateUserBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid payload');
  }

  const candidate = body as Partial<CreateUserBody>;
  if (!candidate.email || !candidate.password || !candidate.role) {
    throw new Error('Missing fields');
  }

  const normalizedEmail = candidate.email.trim().toLowerCase();
  if (normalizedEmail.length > 320 || candidate.password.length > 256) {
    throw new Error('Invalid payload');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Invalid email');
  }

  if (!isStrongPassword(candidate.password)) {
    throw new Error('Weak password');
  }

  if (candidate.role !== 'superadmin' && candidate.role !== 'admin' && candidate.role !== 'cashier') {
    throw new Error('Invalid role');
  }

  return {
    email: normalizedEmail,
    password: candidate.password,
    role: candidate.role,
  };
}

function parseUpdateUserBody(body: unknown): UpdateUserBody {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid payload');
  }

  const candidate = body as Partial<UpdateUserBody>;
  const password = typeof candidate.password === 'string' ? candidate.password : undefined;
  const role = candidate.role;

  if (!password && !role) {
    throw new Error('Missing fields');
  }

  if (password) {
    if (password.length > 256) {
      throw new Error('Invalid payload');
    }

    if (!isStrongPassword(password)) {
      throw new Error('Weak password');
    }
  }

  if (role && role !== 'superadmin' && role !== 'admin' && role !== 'cashier') {
    throw new Error('Invalid role');
  }

  return { password, role };
}

function getErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';

  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden') return 403;
  if (message === 'Missing user id' || message === 'Missing fields' || message === 'Invalid payload' || message === 'Invalid role' || message === 'Invalid email' || message === 'Weak password') return 400;
  if (message === 'Cannot delete your own account' || message === 'Cannot remove your own superadmin role') return 409;
  if (message.toLowerCase().includes('already been registered') || message.toLowerCase().includes('already exists')) return 409;
  return 500;
}

function normalizeUsers(users: User[], profiles: ProfileRecord[]) {
  const profilesByUserId = new Map<string, ProfileRecord>();
  profiles.forEach((profile) => {
    if (profile.user_id) {
      profilesByUserId.set(profile.user_id, profile);
    }
  });

  return users.map((user) => {
    const profile = profilesByUserId.get(user.id);
    const email = user.email || profile?.login || '';
    const role = profile?.role;

    return {
      id: user.id,
      profileId: profile?.id_profiles || null,
      email,
      role: role === 'superadmin' || role === 'admin' || role === 'cashier' ? role : null,
    };
  }).filter((user): user is ManagedUserResponse => user.role === 'superadmin' || user.role === 'admin' || user.role === 'cashier');
}

export async function handler(request: ApiRequest, response: ApiResponse) {
  applyApiSecurityHeaders(response);
  response.setHeader('Content-Type', 'application/json');

  try {
    if (!applyApiCorsHeaders(request, response, ['GET', 'POST', 'PATCH', 'DELETE'])) {
      response.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    if (request.method === 'OPTIONS') {
      response.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
      response.status(204).end();
      return;
    }

    if (!request.method || !['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) {
      response.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']);
      response.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const accessToken = getBearerToken(request);
    const adminClient = createAdminClient();
    const requester = await assertRequesterIsSuperAdmin(adminClient, accessToken);

    if (request.method === 'GET') {
      const [{ data: authUsers, error: authUsersError }, { data: profiles, error: profilesError }] = await Promise.all([
        adminClient.auth.admin.listUsers(),
        adminClient.from('profiles').select('id_profiles, login, role, user_id, created_at, updated_at'),
      ]);

      if (authUsersError) {
        throw authUsersError;
      }

      if (profilesError) {
        throw profilesError;
      }

      response.status(200).json(normalizeUsers(authUsers.users, (profiles || []) as ProfileRecord[]));
      return;
    }

    if (request.method === 'POST') {
      const payload = parseCreateUserBody(request.body);

      const { data: existingUsers, error: existingUsersError } = await adminClient.auth.admin.listUsers();
      if (existingUsersError) {
        throw existingUsersError;
      }

      if (existingUsers.users.some((user) => user.email?.toLowerCase() === payload.email)) {
        throw new Error('User already exists');
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        app_metadata: {
          role: payload.role,
        },
        user_metadata: {
          role: payload.role,
        },
      });

      if (error || !data.user) {
        throw error || new Error('Unable to create user');
      }

      try {
        await ensureProfile(adminClient, data.user, payload.role);
      } catch (profileError) {
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw profileError;
      }

      response.status(201).json({
        id: data.user.id,
        email: data.user.email,
        role: payload.role,
      });
      return;
    }

    if (request.method === 'PATCH') {
      const rawId = request.query?.id;
      const userId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!userId) {
        throw new Error('Missing user id');
      }

      const payload = parseUpdateUserBody(request.body);

      if (requester.id === userId && payload.role && payload.role !== 'superadmin') {
        throw new Error('Cannot remove your own superadmin role');
      }

      const updatePayload: {
        password?: string;
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      } = {};

      if (payload.password) {
        updatePayload.password = payload.password;
      }

      if (payload.role) {
        const { data: currentUserData, error: currentUserError } = await adminClient.auth.admin.getUserById(userId);
        if (currentUserError || !currentUserData.user) {
          throw currentUserError || new Error('User not found');
        }

        updatePayload.app_metadata = {
          ...(currentUserData.user.app_metadata || {}),
          role: payload.role,
        };
        updatePayload.user_metadata = {
          ...(currentUserData.user.user_metadata || {}),
          role: payload.role,
        };
      }

      const { data, error } = await adminClient.auth.admin.updateUserById(userId, updatePayload);
      if (error || !data.user) {
        throw error || new Error('Unable to update user');
      }

      if (payload.role) {
        await ensureProfile(adminClient, data.user, payload.role);
      }

      response.status(200).json({
        id: data.user.id,
        email: data.user.email,
        role: payload.role,
        success: true,
      });
      return;
    }

    if (request.method === 'DELETE') {
      const rawId = request.query?.id;
      const userId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!userId) {
        throw new Error('Missing user id');
      }

      if (requester.id === userId) {
        throw new Error('Cannot delete your own account');
      }

      const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        throw deleteUserError;
      }

      const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('user_id', userId);
      if (profileDeleteError) {
        throw profileDeleteError;
      }

      response.status(200).json({ success: true });
      return;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = getErrorStatus(error);
    response.status(status).json({
      error: status >= 500 ? 'Internal server error' : message,
    });
  }
}

export default handler;
