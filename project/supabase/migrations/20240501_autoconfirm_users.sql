/*
  # Fonction pour confirmer automatiquement un utilisateur
  
  Cette fonction permet de confirmer un utilisateur directement dans la base de données
  sans avoir besoin de cliquer sur un lien de confirmation par email.
*/

-- Fonction pour confirmer un utilisateur
CREATE OR REPLACE FUNCTION admin_confirm_user(user_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Mettre à jour l'utilisateur pour le confirmer
  UPDATE auth.users
  SET 
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmed_at = COALESCE(confirmed_at, now())
  WHERE id = user_id;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erreur lors de la confirmation de l''utilisateur: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Désactiver l'envoi d'emails de confirmation si possible
-- Note: Cette configuration nécessite des droits d'administrateur sur la base de données
DO $$
BEGIN
  -- Essayer de mettre à jour la configuration pour désactiver les emails de confirmation
  BEGIN
    ALTER SYSTEM SET auth.email_confirm_required = 'false';
    SELECT pg_reload_conf();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Impossible de modifier la configuration système. Les emails de confirmation restent activés.';
  END;
END $$;

-- Confirmer tous les utilisateurs existants qui ne sont pas encore confirmés
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at = COALESCE(confirmed_at, now())
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL; 