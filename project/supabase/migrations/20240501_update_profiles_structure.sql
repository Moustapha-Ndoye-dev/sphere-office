/*
  # Migration pour adapter la table profiles existante
  
  1. Ajout de la colonne user_id pour lier à auth.users
  2. Adaptation des déclencheurs pour maintenir la cohérence
*/

-- Ajouter la colonne user_id si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Ajouter une contrainte unique sur user_id
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Activer RLS si ce n'est pas déjà fait
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

-- Mettre à jour les profils existants pour les lier aux utilisateurs auth
DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN SELECT id, email FROM auth.users LOOP
    -- Rechercher un profil avec le même login que l'email
    UPDATE public.profiles
    SET user_id = v_user.id
    WHERE login = v_user.email
    AND (user_id IS NULL OR user_id = v_user.id);
    
    -- Si aucun profil n'a été mis à jour, en créer un nouveau
    IF NOT FOUND THEN
      INSERT INTO public.profiles (user_id, login, mdp, role)
      VALUES (
        v_user.id,
        v_user.email,
        crypt('default_password', gen_salt('bf')),
        CASE 
          WHEN v_user.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'admin'
          ELSE 'cashier'
        END
      )
      ON CONFLICT (login) DO UPDATE SET user_id = v_user.id;
    END IF;
  END LOOP;
END $$; 