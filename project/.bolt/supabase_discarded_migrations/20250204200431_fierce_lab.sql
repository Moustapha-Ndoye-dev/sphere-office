/*
  # Ajout des utilisateurs administrateurs

  1. Nouveaux Utilisateurs
    - Ajoute deux administrateurs avec leurs emails
    - Configure leurs rôles et permissions

  2. Sécurité
    - Les mots de passe seront définis lors de la première connexion
*/

-- Ajouter les utilisateurs administrateurs
INSERT INTO auth.users (
  email,
  email_confirmed_at,
  role
)
VALUES 
  ('youneshachami9@gmail.com', CURRENT_TIMESTAMP, 'authenticated'),
  ('ibrahimadiawo582@gmail.com', CURRENT_TIMESTAMP, 'authenticated');

-- Ajouter les rôles administrateurs
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM auth.users
WHERE email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com');