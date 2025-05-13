-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS create_user_with_profile;
DROP FUNCTION IF EXISTS delete_user_with_profile;

-- Create improved function to create user and profile
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

  -- Update user's app_metadata with role
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', p_role)
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved function to delete user and profile
CREATE OR REPLACE FUNCTION delete_user_with_profile(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete profile first (to avoid foreign key issues)
  DELETE FROM profiles WHERE user_id = p_user_id;
  
  -- Delete from auth.identities
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  
  -- Finally delete the user
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_with_profile TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_with_profile TO authenticated;

-- Create or update RLS policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Only admins can manage profiles" ON profiles;

CREATE POLICY "profiles_read_policy"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_write_policy"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
  )
);