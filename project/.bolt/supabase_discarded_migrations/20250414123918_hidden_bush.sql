-- Supprimer l'ancien utilisateur s'il existe
DELETE FROM auth.users WHERE email = 'youneshachami9@gmail.com';

-- Créer l'utilisateur administrateur
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'youneshachami9@gmail.com',
  crypt('Admin123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"], "role": "admin"}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- Ajouter l'identité de l'utilisateur avec provider_id
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  email, -- Utiliser l'email comme provider_id
  now(),
  now(),
  now()
FROM auth.users
WHERE email = 'youneshachami9@gmail.com';

-- Accorder les permissions d'administrateur
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'youneshachami9@gmail.com';