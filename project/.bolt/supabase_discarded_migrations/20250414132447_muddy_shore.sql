/*
  # Fix Profiles Table and User Management
  
  1. Changes
    - Drop and recreate profiles table with proper structure
    - Create simplified RLS policies
    - Update user management functions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "enable_profiles_select" ON profiles;
DROP POLICY IF EXISTS "enable_profiles_all" ON profiles;

-- Drop and recreate the profiles table
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'cashier')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "allow_public_read"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_auth_all"
ON profiles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to create user and profile
CREATE OR REPLACE FUNCTION create_user_with_profile(
  p_email text,
  p_password text,
  p_role text
)
RETURNS uuid AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Input validation
  IF p_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'Invalid role. Must be either admin or cashier';
  END IF;

  -- Create user in auth.users
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
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email'],
      'role', p_role
    ),
    '{}'::jsonb,
    now(),
    now()
  ) RETURNING id INTO v_user_id;

  -- Create identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', p_email,
      'role', p_role
    ),
    'email',
    p_email,
    now(),
    now(),
    now()
  );

  -- Create profile
  INSERT INTO profiles (user_id, role)
  VALUES (v_user_id, p_role);

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete user and profile
CREATE OR REPLACE FUNCTION delete_user_with_profile(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete profile first (to avoid foreign key issues)
  DELETE FROM profiles WHERE user_id = p_user_id;
  
  -- Delete from auth.identities
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  
  -- Finally delete the user
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT EXECUTE ON FUNCTION create_user_with_profile TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_with_profile TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Insert initial admin users if they don't exist
DO $$ 
BEGIN
  -- Create first admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'youneshachami9@gmail.com') THEN
    PERFORM create_user_with_profile('youneshachami9@gmail.com', 'Admin123', 'admin');
  END IF;

  -- Create second admin user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'ibrahimadiawo582@gmail.com') THEN
    PERFORM create_user_with_profile('ibrahimadiawo582@gmail.com', 'Admin123', 'admin');
  END IF;
END $$;