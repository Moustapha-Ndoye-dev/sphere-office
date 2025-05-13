/*
  # Fonctions de gestion des utilisateurs pour Supabase
  
  1. Création de la table profiles selon le nouveau schéma
  2. Fonctions de création et suppression des utilisateurs avec profil
  3. Déclencheurs pour maintenir la cohérence
*/

-- Créer la table profiles avec le nouveau schéma
DROP TABLE IF EXISTS public.profiles;
CREATE TABLE public.profiles (
  id_profiles uuid not null default extensions.uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  login character varying(255) not null,
  mdp character varying(255) not null,
  role character varying(50) not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint profiles_pkey primary key (id_profiles),
  constraint profiles_login_key unique (login),
  constraint profiles_user_id_key unique (user_id),
  constraint profiles_role_check check (
    (
      (role)::text = any (
        array[
          ('admin'::character varying)::text,
          ('cashier'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes pour éviter les erreurs
DROP POLICY IF EXISTS "profiles_public_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_auth_all" ON public.profiles;

-- Créer les politiques RLS de base
CREATE POLICY "profiles_public_select"
ON public.profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "profiles_auth_all"
ON public.profiles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Fonction pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le déclencheur pour updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Fonction pour créer un utilisateur avec profil
CREATE OR REPLACE FUNCTION create_user_with_profile(
  p_email text,
  p_password text,
  p_role text DEFAULT 'cashier'
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Validation des entrées
  IF p_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Role invalide. Doit être admin ou cashier';
  END IF;

  -- Créer l'utilisateur dans auth.users avec confirmation automatique
  INSERT INTO auth.users (
    email,
    password,
    email_confirmed_at,  -- Définir explicitement pour confirmer automatiquement
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,         -- Définir à false pour les utilisateurs créés manuellement
    confirmed_at         -- Également définir confirmed_at pour la compatibilité
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),               -- Confirmer immédiatement l'email
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email'],
      'role', p_role
    ),
    '{}'::jsonb,
    false,               -- Pas un utilisateur SSO
    now()                -- Confirmé maintenant
  ) RETURNING id INTO v_user_id;

  -- Créer l'identité
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at
  ) VALUES (
    p_email,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', p_email
    ),
    'email',
    now()
  );

  -- Créer le profil manuellement (le déclencheur devrait le faire, mais pour être sûr)
  INSERT INTO public.profiles (user_id, login, mdp, role)
  VALUES (v_user_id, p_email, crypt(p_password, gen_salt('bf')), p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = p_role;

  RETURN v_user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour supprimer un utilisateur avec profil
CREATE OR REPLACE FUNCTION delete_user_with_profile(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Supprimer le profil d'abord (pour éviter des problèmes de contraintes)
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  
  -- Supprimer l'utilisateur
  DELETE FROM auth.users WHERE id = p_user_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Déclencheur pour créer un profil à la création d'un utilisateur
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le profil existe déjà
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    -- Mettre à jour le rôle si nécessaire
    UPDATE public.profiles 
    SET role = COALESCE(
      (NEW.raw_app_meta_data->>'role')::text,
      CASE 
        WHEN NEW.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'admin'
        ELSE 'cashier'
      END
    )
    WHERE user_id = NEW.id;
  ELSE
    -- Créer un nouveau profil avec login = email et mdp = mot de passe hashé
    INSERT INTO public.profiles (user_id, login, mdp, role)
    VALUES (
      NEW.id,
      NEW.email,
      -- Utiliser un mot de passe par défaut hashé
      crypt('default_password', gen_salt('bf')),
      COALESCE(
        (NEW.raw_app_meta_data->>'role')::text,
        CASE 
          WHEN NEW.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'admin'
          ELSE 'cashier'
        END
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur lors de la création/mise à jour du profil: %', SQLERRM;
    RETURN NEW; -- Continuer même en cas d'erreur
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le déclencheur si nécessaire
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_profile_for_user();

-- S'assurer que tous les utilisateurs existants ont un profil
INSERT INTO public.profiles (user_id, login, mdp, role)
SELECT 
  id, 
  email,
  crypt('default_password', gen_salt('bf')),
  COALESCE(
    (raw_app_meta_data->>'role')::text,
    CASE 
      WHEN email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'admin'
      ELSE 'cashier'
    END
  )
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE public.profiles.user_id = auth.users.id
);

-- Confirmer tous les utilisateurs existants qui ne sont pas encore confirmés
UPDATE auth.users 
SET 
  email_confirmed_at = now(),
  confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- Fonction pour récupérer tous les utilisateurs de auth.users
CREATE OR REPLACE FUNCTION get_all_auth_users()
RETURNS TABLE (
  id uuid,
  email text,
  role text
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    COALESCE(p.role, CASE 
      WHEN au.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'admin'
      ELSE 'cashier'
    END) as role
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer tous les utilisateurs depuis la table profiles
CREATE OR REPLACE FUNCTION query_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  role text
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id as id,
    p.login as email,
    p.role
  FROM public.profiles p
  ORDER BY p.id_profiles DESC;
END;
$$ LANGUAGE plpgsql; 