/*
  # Fix site settings authentication policies
  
  1. Drop existing policies
  2. Create new simplified policies for authenticated users
  3. Ensure proper permissions are granted
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view site settings" ON site_settings;
DROP POLICY IF EXISTS "Only admins can edit site settings" ON site_settings;

-- Create new simplified policies
CREATE POLICY "enable_public_read"
ON site_settings FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_auth_all"
ON site_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON site_settings TO authenticated;
GRANT SELECT ON site_settings TO public;