import { useAuthStore } from '../store/auth';
import { supabase } from './supabase';
import { checkSession as checkSessionSupabase, isAdmin as checkIsAdmin, isCashier as checkIsCashier, onAuthStateChange as watchAuthState } from './auth.supabase';

// Liste des administrateurs connus
const knownAdmins = ['youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com'];

/**
 * Nouvelle fonction de connexion qui utilise directement la table profiles
 * pour la vérification des rôles
 */
export async function signInWithProfiles(email: string, password: string) {
  try {
    console.log('SignInWithProfiles: Tentative de connexion pour:', email);
    
    // 1. Connexion avec Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('SignInWithProfiles: Erreur d\'authentification:', error);
      throw error;
    }

    if (!data.user) {
      console.error('SignInWithProfiles: Aucun utilisateur trouvé après connexion');
      throw new Error('Aucun utilisateur trouvé');
    }
    
    console.log('SignInWithProfiles: Connexion réussie, utilisateur:', data.user.id);
    
    // Vérifier si l'email est dans la liste des admins connus en premier
    const isKnownAdmin = knownAdmins.includes(email.toLowerCase());
    if (isKnownAdmin) {
      console.log('SignInWithProfiles: IMPORTANT - Utilisateur est un admin connu');
    }
    
    // 2. Vérification explicite du rôle dans la table profiles
    let role = isKnownAdmin ? 'admin' : 'cashier'; // Valeur par défaut basée sur la liste des admins connus
    let profileExists = false;
    
    try {
      console.log('SignInWithProfiles: Recherche du profil pour:', data.user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, login')
        .eq('user_id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('SignInWithProfiles: Erreur lors de la recherche du profil:', profileError);
        // Ne pas créer ou écraser le profil si une erreur survient, juste avertir
      } else if (profileData) {
        console.log('SignInWithProfiles: Profil trouvé avec rôle:', profileData.role);
        profileExists = true;
        // Si l'utilisateur est un admin connu mais que son profil dit autre chose, forcer le rôle admin
        if (isKnownAdmin && profileData.role !== 'admin') {
          console.log('SignInWithProfiles: FORCER le rôle admin pour un admin connu (profil trouvé mais rôle incorrect)');
          role = 'admin';
          // Mettre à jour le profil pour corriger le rôle
          // try {
          //   const { error: updateError } = await supabase
          //     .from('profiles')
          //     .update({ role: 'admin' })
          //     .eq('user_id', data.user.id);
          //   if (updateError) {
          //     console.error('SignInWithProfiles: Erreur lors de la mise à jour du profil:', updateError);
          //   } else {
          //     console.log('SignInWithProfiles: Profil mis à jour avec le rôle admin');
          //   }
          // } catch (updateError) {
          //   console.error('SignInWithProfiles: Exception lors de la mise à jour du profil:', updateError);
          // }
        } else {
          // Utiliser le rôle du profil comme source de vérité (sauf pour les admins connus)
          role = isKnownAdmin ? 'admin' : profileData.role;
          console.log('SignInWithProfiles: Rôle final basé sur le profil:', role);
        }
      }
    } catch (profileError) {
      console.error('SignInWithProfiles: Exception lors de la recherche du profil:', profileError);
      // Ne pas créer ou écraser le profil si une erreur survient
    }
    
    // 4. Créer un profil si nécessaire (seulement s'il n'existe pas)
    if (!profileExists) {
      console.log('SignInWithProfiles: Création d\'un nouveau profil avec rôle:', role);
      try {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            login: email,
            mdp: 'default_password_hashed',
            role: role
          });
        if (insertError) {
          console.error('SignInWithProfiles: Erreur lors de la création du profil:', insertError);
        } else {
          console.log('SignInWithProfiles: Profil créé avec succès');
        }
      } catch (insertError) {
        console.error('SignInWithProfiles: Exception lors de la création du profil:', insertError);
      }
    }
    
    // Vérification finale du rôle
    if (role !== 'admin' && role !== 'cashier') {
      console.warn('SignInWithProfiles: Rôle invalide détecté:', role, 'utilisation de cashier par défaut');
      role = 'cashier';
    }
    
    // Si c'est un admin connu, forcer le rôle admin quoi qu'il arrive
    if (isKnownAdmin) {
      console.log('SignInWithProfiles: FORÇAGE FINAL du rôle admin pour un admin connu');
      role = 'admin';
    }
    
    // 5. Créer l'objet utilisateur et mettre à jour le store
    const userObj = {
      id: data.user.id,
      email: data.user.email || '',
      role: role
    };
    
    console.log('SignInWithProfiles: Utilisateur final avec rôle:', role);
    useAuthStore.getState().setUser(userObj);
    
    return { user: userObj };
  } catch (error) {
    console.error('SignInWithProfiles: Erreur globale:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  try {
    console.log('Tentative de connexion pour:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data.user) {
      throw new Error('Aucun utilisateur trouvé');
    }

    // Vérifier si l'email est dans la liste des admins connus
    const isKnownAdmin = knownAdmins.includes(email.toLowerCase());
    console.log('Est un admin connu:', isKnownAdmin);
    
    // Récupérer le rôle depuis la table profiles - PRIORITAIRE
    let role = isKnownAdmin ? 'admin' : 'cashier'; // Valeur par défaut basée sur la liste des admins connus
    let profileFound = false;
    
    try {
      console.log('Tentative de récupération du profil pour:', data.user.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, login')
        .eq('user_id', data.user.id)
        .single();
      
      if (!profileError && profileData) {
        console.log('Profil trouvé avec rôle:', profileData.role, 'et login:', profileData.login);
        profileFound = true;
        
        // Si l'utilisateur est un admin connu mais que son profil dit autre chose, forcer le rôle admin
        if (isKnownAdmin && profileData.role !== 'admin') {
          console.log('Forcer le rôle admin pour un admin connu');
          role = 'admin';
          
          // Mettre à jour le profil pour corriger le rôle
          // const { error: updateError } = await supabase
          //   .from('profiles')
          //   .update({ role: 'admin' })
          //   .eq('user_id', data.user.id);

          // if (updateError) {
          //   console.warn("Impossible de mettre à jour le rôle admin:", updateError);
          // } else {
          //   console.log('Profil mis à jour avec le rôle admin');
          // }
        } else {
          // Utiliser le rôle du profil comme source de vérité
          role = profileData.role;
          console.log('Utilisation du rôle du profil:', role);
        }
      } else {
        console.log('Profil non trouvé, création d\'un nouveau profil');
        // Si pas de profil trouvé, vérifier les métadonnées ou utiliser la valeur par défaut
        role = data.user.user_metadata?.role || (isKnownAdmin ? 'admin' : 'cashier');
        
        // Essayer de créer un profil
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            login: email,
            mdp: 'default_password_hashed', // Idéalement, il faudrait hasher le mot de passe
            role: role
          });
          
        if (insertError) {
          console.warn("Impossible de créer un profil pour l'utilisateur:", insertError);
        } else {
          console.log('Profil créé avec succès, rôle:', role);
          profileFound = true;
        }
      }
    } catch (profileError) {
      console.error("Erreur lors de la récupération du profil:", profileError);
      // Fallback sur les métadonnées ou la liste des admins connus
      role = isKnownAdmin ? 'admin' : (data.user.user_metadata?.role || 'cashier');
      console.log('Rôle fallback assigné:', role);
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
            user_id: data.user.id,
            login: email,
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

  // Créer un objet user pour le store
  const userObj = {
      id: data.user.id,
      email: data.user.email || '',
      role: role
    };

    console.log('Utilisateur connecté avec rôle final:', role);

  // Mettre à jour le store
  useAuthStore.getState().setUser(userObj);

  return { user: userObj };
  } catch (error) {
    console.error('Erreur de connexion:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
  useAuthStore.getState().setUser(null);
  window.location.href = '/admin/login';
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    // Utiliser checkSession pour vérifier et mettre à jour le store
    const isLoggedIn = await checkSessionSupabase();
    
    if (!isLoggedIn) {
      return null;
    }
    
    // Retourner l'utilisateur du store (déjà mis à jour par checkSession)
    return useAuthStore.getState().user;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
}
}

// Réexporter les fonctions de auth.supabase.ts
export const isAdmin = checkIsAdmin;
export const isCashier = checkIsCashier;
export const onAuthStateChange = watchAuthState;
export const checkSession = checkSessionSupabase;