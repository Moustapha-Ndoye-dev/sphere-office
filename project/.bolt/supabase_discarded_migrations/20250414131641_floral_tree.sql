-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Only admins can manage users" ON users;

-- Create new unified policies for users table
CREATE POLICY "users_read_policy" 
ON users FOR SELECT 
TO authenticated 
USING (
  -- Users can view their own data OR admins can view all
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
  )
);

CREATE POLICY "users_write_policy" 
ON users FOR ALL 
TO authenticated 
USING (
  -- Only admins can modify users
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
  )
);

-- Ensure proper permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;