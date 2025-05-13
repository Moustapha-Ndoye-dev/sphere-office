-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create basic users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  role
)
VALUES 
  (
    uuid_generate_v4(),
    'youneshachami9@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    'authenticated'
  ),
  (
    uuid_generate_v4(),
    'ibrahimadiawo582@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    'authenticated'
  );