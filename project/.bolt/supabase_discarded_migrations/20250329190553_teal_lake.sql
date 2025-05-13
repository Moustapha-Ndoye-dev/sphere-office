/*
  # Fix Promotions RLS Policies
  
  1. Drop existing policies
  2. Create new policies for public read access
  3. Create policies for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Promotions are viewable by everyone" ON promotions;
DROP POLICY IF EXISTS "Promotions are editable by admins" ON promotions;

-- Create new policies
CREATE POLICY "promotions_public_read"
ON promotions FOR SELECT
TO public
USING (true);

CREATE POLICY "promotions_auth_all"
ON promotions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON promotions TO public;
GRANT ALL ON promotions TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;