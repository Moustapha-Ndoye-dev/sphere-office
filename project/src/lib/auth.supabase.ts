import { supabase } from './supabase';
import { useAuthStore } from '../store/auth';

// Liste des administrateurs connus
const knownAdmins = ['youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com'];

/**
 * Vérifie si la session Supabase est valide et met à jour le store auth
 * @returns True si l'utilisateur est connecté
 */
export async function checkSession() {
  try {
    console.log('Début de checkSession - Tentative de récupération de la session');
    
    // Test de connexion à Supabase avec un timeout de 30 secondes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    try {
      const { data: healthCheck } = await supabase.from('profiles').select('count').limit(1);
      console.log('Test de connexion Supabase réussi:', healthCheck);
      clearTimeout(timeoutId);
    } catch (healthError) {
      clearTimeout(timeoutId);
      console.error('Erreur lors du test de connexion à Supabase:', healthError);
      if (healthError instanceof DOMException && healthError.name === 'AbortError') {
        throw new Error('Connexion à Supabase trop lente. Vérifiez votre connexion internet.');
      }
      throw new Error('Impossible de se connecter à Supabase. Vérifiez les informations de connexion.');
    }
    
    const { data, error } = await supabase.auth.getSession();
    
    console.log('Résultat de getSession:', data ? 'Session trouvée' : 'Pas de session', error ? `Erreur: ${error.message}` : 'Sans erreur');
    
    if (error || !data.session) {
      console.log('Pas de session valide, déconnexion');
      useAuthStore.getState().setUser(null);
      return false;
    }
    
    // Session valide, récupérer le rôle depuis la table profiles
    const user = data.session.user;
    console.log('Utilisateur trouvé:', user.id, user.email);
    
    // Vérifier si l'email est dans la liste des admins connus
    const isKnownAdmin = user.email ? knownAdmins.includes(user.email.toLowerCase()) : false;
    console.log('Est un admin connu:', isKnownAdmin);
    
    // D'abord, essayer de récupérer depuis profiles (SOURCE DE VÉRITÉ PRINCIPALE)
    let role = isKnownAdmin ? 'admin' : 'cashier'; // Valeur par défaut basée sur la liste des admins connus
    let profileFound = false;
    
    try {
      console.log('Tentative de récupération du profil pour:', user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, login')
        .eq('user_id', user.id)
        .single();
      
      console.log('Résultat de la recherche de profil:', profileData ? 'Profil trouvé' : 'Pas de profil', 
                 profileError ? `Erreur: ${profileError.message}` : 'Sans erreur');
      
      if (!profileError && profileData) {
        profileFound = true;
        console.log('Profil trouvé avec rôle:', profileData.role, 'et login:', profileData.login);
        
        // Si l'utilisateur est un admin connu mais que son profil dit autre chose, forcer le rôle admin
        if (isKnownAdmin && profileData.role !== 'admin') {
          console.log('Forcer le rôle admin pour un admin connu');
          role = 'admin';
          
          // Mettre à jour le profil pour corriger le rôle
          // const { error: updateError } = await supabase
          //   .from('profiles')
          //   .update({ role: 'admin' })
          //   .eq('user_id', user.id);
            
          // if (updateError) {
          //   console.warn("Impossible de mettre à jour le rôle admin:", updateError);
          // } else {
          //   console.log('Profil mis à jour avec le rôle admin');
          // }
        } else {
          // Utiliser le rôle du profil comme source principale de vérité
          role = profileData.role;
          console.log('Utilisation du rôle du profil:', role);
        }
      } else {
        // Si pas de profil trouvé, essayer de créer un profil
        role = isKnownAdmin ? 'admin' : 'cashier';
        console.log('Rôle par défaut assigné:', role);
        
        // Tenter de créer un profil
        console.log('Tentative de création d\'un profil pour:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            login: user.email,
            mdp: 'default_password_hashed', // Idéalement, il faudrait hasher le mot de passe
            role: role
          });
          
        if (insertError) {
          console.warn("Impossible de créer un profil pour l'utilisateur:", insertError);
        } else {
          console.log('Profil créé avec succès avec rôle:', role);
          profileFound = true;
        }
      }
    } catch (profileError) {
      console.error("Erreur lors de la récupération du profil:", profileError);
      // Fallback sur les métadonnées ou la liste des admins connus
      role = isKnownAdmin ? 'admin' : (user.user_metadata?.role || 'cashier');
      console.log('Rôle fallback depuis metadata ou liste connue:', role);
    }
    
    // Vérification supplémentaire pour les admins connus
    if (!profileFound && isKnownAdmin) {
      console.log('Admin connu sans profil, forçage du rôle admin');
      role = 'admin';
      
      // Tenter de créer un profil pour cet admin connu
      try {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            login: user.email,
            mdp: 'default_password_hashed',
            role: 'admin'
          });
          
        if (insertError) {
          console.warn("Impossible de créer un profil pour l'admin connu:", insertError);
        } else {
          console.log('Profil admin créé avec succès');
        }
      } catch (insertError) {
        console.error("Erreur lors de la création du profil admin:", insertError);
      }
    }
    
    // Mettre à jour le store
    console.log('Mise à jour du store avec:', user.id, user.email, 'rôle final:', role);
    useAuthStore.getState().setUser({
      id: user.id,
      email: user.email || '',
      role: role
    });
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la vérification de la session:', error);
    useAuthStore.getState().setUser(null);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur courant a le rôle admin
 * @returns True si l'utilisateur est admin
 */
export async function isAdmin() {
  // Vérifier d'abord le store local
  const user = useAuthStore.getState().user;
  if (user) {
    return user.role === 'admin';
  }
  
  // Sinon vérifier la session
  const isLoggedIn = await checkSession();
  if (!isLoggedIn) {
    return false;
  }
  
  // Maintenant que le store est à jour, vérifier le rôle
  return useAuthStore.getState().user?.role === 'admin';
}

/**
 * Vérifie si l'utilisateur courant a le rôle caissier
 * @returns True si l'utilisateur est caissier
 */
export async function isCashier() {
  // Vérifier d'abord le store local
  const user = useAuthStore.getState().user;
  if (user) {
    return user.role === 'cashier';
  }
  
  // Sinon vérifier la session
  const isLoggedIn = await checkSession();
  if (!isLoggedIn) {
    return false;
  }
  
  // Maintenant que le store est à jour, vérifier le rôle
  return useAuthStore.getState().user?.role === 'cashier';
}

/**
 * Vérifie si l'utilisateur a au moins un des rôles spécifiés
 * @param roles Les rôles autorisés
 * @returns True si l'utilisateur a au moins un des rôles
 */
export async function hasAnyRole(roles: string[]) {
  // Vérifier d'abord le store local
  const user = useAuthStore.getState().user;
  if (user) {
    return roles.includes(user.role);
  }
  
  // Sinon vérifier la session
  const isLoggedIn = await checkSession();
  if (!isLoggedIn) {
    return false;
  }
  
  // Maintenant que le store est à jour, vérifier le rôle
  const updatedUser = useAuthStore.getState().user;
  return updatedUser ? roles.includes(updatedUser.role) : false;
}

/**
 * S'abonne aux changements d'état d'authentification
 * @param callback Fonction à appeler quand l'état change
 * @returns Fonction pour se désabonner
 */
export function onAuthStateChange(callback: (event: 'SIGNED_IN' | 'SIGNED_OUT', session: any) => void) {
  // S'abonner aux changements d'état d'authentification de Supabase
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      // Récupérer le rôle depuis la table profiles
      let role = 'cashier'; // Valeur par défaut
      const isKnownAdmin = session.user.email ? knownAdmins.includes(session.user.email.toLowerCase()) : false;
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        if (!profileError && profileData) {
          // Si l'utilisateur est un admin connu mais que son profil dit autre chose, forcer le rôle admin
          if (isKnownAdmin && profileData.role !== 'admin') {
            role = 'admin';
            
            // Mettre à jour le profil pour corriger le rôle
            // await supabase.from('profiles').update({ role: 'admin' }) ...
          } else {
            role = profileData.role;
          }
        } else {
          // Fallback sur les métadonnées ou la liste des admins connus
          role = isKnownAdmin ? 'admin' : (session.user.user_metadata?.role || 'cashier');
          
          // Tenter de créer un profil
          // await supabase.from('profiles').insert({ ... }) ...
        }
      } catch (profileError) {
        console.warn("Erreur lors de la récupération du profil:", profileError);
        // Fallback sur les métadonnées ou la liste des admins connus
        role = isKnownAdmin ? 'admin' : (session.user.user_metadata?.role || 'cashier');
      }

      // Mettre à jour le store
      useAuthStore.getState().setUser({
        id: session.user.id,
        email: session.user.email || '',
        role: role
      });
      
      callback('SIGNED_IN', session);
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null);
      callback('SIGNED_OUT', null);
    }
  });

  // Également s'abonner aux changements dans le store local
  const unsubscribeStore = useAuthStore.subscribe(
    (state) => state.user,
    (user) => {
      callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', user ? { user } : null);
    }
  );

  return {
    unsubscribe: () => {
      data.subscription.unsubscribe();
      unsubscribeStore();
    }
  };
} 