-- Alter profiles table to add full_name and phone_number if they don't exist
DO $$ 
BEGIN
  -- Check if full_name column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN full_name text NOT NULL DEFAULT '';
  END IF;

  -- Check if phone_number column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text NOT NULL DEFAULT '';
    
    -- Add unique constraint for phone_number
    ALTER TABLE profiles ADD CONSTRAINT profiles_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- Create function to validate phone number if it doesn't exist
CREATE OR REPLACE FUNCTION validate_phone_number(phone text)
RETURNS boolean AS $$
BEGIN
  RETURN phone ~ '^\+?[0-9]{10,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add phone number validation constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'valid_phone_number'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT valid_phone_number CHECK (validate_phone_number(phone_number));
  END IF;
END $$;

-- Update create_user_with_profile function to include full_name and phone_number
CREATE OR REPLACE FUNCTION create_user_with_profile(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone_number text,
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
    jsonb_build_object(
      'full_name', p_full_name,
      'phone_number', p_phone_number
    ),
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
      'full_name', p_full_name,
      'phone_number', p_phone_number,
      'role', p_role
    ),
    'email',
    p_email,
    now(),
    now(),
    now()
  );

  -- Create profile
  INSERT INTO profiles (user_id, full_name, phone_number, role)
  VALUES (v_user_id, p_full_name, p_phone_number, p_role);

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);

-- Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
GRANT EXECUTE ON FUNCTION create_user_with_profile TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_with_profile TO authenticated;
GRANT EXECUTE ON FUNCTION validate_phone_number TO authenticated;