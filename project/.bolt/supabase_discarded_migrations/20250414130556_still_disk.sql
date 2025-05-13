-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'cashier')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Only admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
    )
  );

-- Create function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(email text, password text)
RETURNS boolean AS $$
DECLARE
  stored_password text;
BEGIN
  SELECT users.password INTO stored_password
  FROM users
  WHERE users.email = verify_password.email;
  
  RETURN stored_password = crypt(password, stored_password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial admin users
INSERT INTO users (email, password, role)
VALUES 
  ('youneshachami9@gmail.com', hash_password('Admin123'), 'admin'),
  ('ibrahimadiawo582@gmail.com', hash_password('Admin123'), 'admin'),
  ('caissier@sphere-office.com', hash_password('Caissier123'), 'cashier')
ON CONFLICT (email) DO UPDATE
SET 
  password = EXCLUDED.password,
  role = EXCLUDED.role;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT EXECUTE ON FUNCTION hash_password TO authenticated;
GRANT EXECUTE ON FUNCTION verify_password TO authenticated;