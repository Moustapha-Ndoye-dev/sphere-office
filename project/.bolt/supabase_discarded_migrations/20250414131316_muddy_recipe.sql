/*
  # Add users and profiles
  
  1. Create users in auth.users table
  2. Create profiles for users
  3. Link users to their roles
*/

-- Create users in auth.users
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
) VALUES 
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'youneshachami9@gmail.com',
    crypt('Admin123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'ibrahimadiawo582@gmail.com',
    crypt('Admin123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'caissier@sphere-office.com',
    crypt('Caissier123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (email) DO NOTHING;

-- Add identities for users
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
  email,
  now(),
  now(),
  now()
FROM auth.users
WHERE email IN (
  'youneshachami9@gmail.com',
  'ibrahimadiawo582@gmail.com',
  'caissier@sphere-office.com'
)
ON CONFLICT DO NOTHING;

-- Create profiles for users
INSERT INTO profiles (user_id, role)
SELECT 
  id as user_id,
  CASE 
    WHEN email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com') THEN 'admin'
    ELSE 'cashier'
  END as role
FROM auth.users
WHERE email IN (
  'youneshachami9@gmail.com',
  'ibrahimadiawo582@gmail.com',
  'caissier@sphere-office.com'
)
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role;