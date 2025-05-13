import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Types
export type ProfileRole = 'admin' | 'cashier';
export interface Profile {
  id_profiles: string;
  login: string;
  mdp: string;
  role: ProfileRole;
  created_at?: string;
  updated_at?: string;
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Register
export async function registerProfile(email: string, password: string, role: ProfileRole): Promise<Omit<Profile, 'mdp'>> {
  // Vérifier unicité
  const { data: existing } = await supabase
    .from('profiles')
    .select('id_profiles')
    .eq('login', email)
    .single();
  if (existing) throw new Error('Email déjà utilisé');
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('profiles')
    .insert({ login: email, mdp: hash, role })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const { mdp, ...rest } = data as Profile;
  return rest;
}

// Login
export async function loginProfile(email: string, password: string): Promise<{ token: string; profile: Omit<Profile, 'mdp'> }> {
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('login', email)
    .single();
  if (error || !user) throw new Error('Identifiants invalides');
  const valid = await bcrypt.compare(password, user.mdp);
  if (!valid) throw new Error('Identifiants invalides');
  const { mdp, ...profile } = user as Profile;
  const token = jwt.sign({ id: profile.id_profiles, email: profile.login, role: profile.role }, JWT_SECRET, { expiresIn: '2h' });
  return { token, profile };
}

// Vérifier un JWT
export function verifyJWT(token: string): { id: string; email: string; role: ProfileRole } {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: ProfileRole };
}

// Lire un profil
export async function getProfileById(id: string): Promise<Omit<Profile, 'mdp'> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id_profiles, login, role, created_at, updated_at')
    .eq('id_profiles', id)
    .single();
  if (error || !data) return null;
  return data;
}

// Modifier un profil
export async function updateProfile(id: string, data: Partial<{ email: string; password: string; role: ProfileRole }>): Promise<Omit<Profile, 'mdp'>> {
  const update: any = {};
  if (data.email) update.login = data.email;
  if (data.role) update.role = data.role;
  if (data.password) update.mdp = await bcrypt.hash(data.password, 10);
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id_profiles', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const { mdp, ...rest } = updated as Profile;
  return rest;
}

// Supprimer un profil
export async function deleteProfile(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id_profiles', id);
  if (error) throw new Error(error.message);
  return true;
}

// Les appels aux Edge Functions sont supprimés car on utilise maintenant l'accès direct à Supabase côté front ou via d'autres services.
// Exemple :
// const res = await fetch("https://<ton-projet>.functions.supabase.co/register", { ... });
// const res = await fetch("https://<ton-projet>.functions.supabase.co/updateProfile", { ... });

// (Supprimer createUser et updateUser)

// Les appels aux Edge Functions sont supprimés car on utilise maintenant l'accès direct à Supabase côté front ou via d'autres services.
// Exemple :
// const res = await fetch("https://<ton-projet>.functions.supabase.co/register", { ... });
// const res = await fetch("https://<ton-projet>.functions.supabase.co/updateProfile", { ... }); 