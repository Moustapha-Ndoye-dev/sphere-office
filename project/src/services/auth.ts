import { supabase } from '../lib/supabase';

export async function login(login: string, password: string) {
  console.log('[LOGIN] Tentative de connexion pour :', login);
  // 1. Chercher le profil par login (login peut être un email ou un pseudo)
  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('login', login)
    .single();

  console.log('[LOGIN] Résultat de la requête Supabase :', user, error);

  if (error || !user) {
    console.warn('[LOGIN] Utilisateur non trouvé ou erreur:', error);
    throw new Error('Identifiants invalides');
  }

  // 2. Comparer le mot de passe (en clair)
  console.log('[LOGIN] Mot de passe saisi :', password);
  console.log('[LOGIN] Mot de passe attendu :', user.mdp);
  if (user.mdp !== password) {
    console.warn('[LOGIN] Mot de passe incorrect');
    throw new Error('Identifiants invalides');
  }

  // 3. Stocker le profil localement
  localStorage.setItem('user', JSON.stringify({
    id: user.id_profiles,
    login: user.login,
    role: user.role
  }));

  console.log('[LOGIN] Connexion réussie pour :', user.login, 'avec le rôle :', user.role);

  return {
    id: user.id_profiles,
    login: user.login,
    role: user.role
  };
}

export async function register(login: string, password: string, role: string) {
  // Vérifier si le login existe déjà (login = email ou pseudo)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id_profiles')
    .eq('login', login)
    .single();

  if (existing) throw new Error('Ce login est déjà utilisé');

  // Créer le profil (mot de passe en clair dans mdp)
  const { data, error } = await supabase
    .from('profiles')
    .insert({ login, mdp: password, role })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Ne pas connecter automatiquement l'utilisateur (ne rien stocker dans le localStorage)
  // Retourner simplement le profil créé
  return {
    id: data.id_profiles,
    login: data.login,
    role: data.role
  };
}

export function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function logout() {
  localStorage.removeItem('user');
  window.location.href = '/admin/login';
} 