-- Drop existing policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are editable by admins" ON products;
DROP POLICY IF EXISTS "enable_public_access" ON products;
DROP POLICY IF EXISTS "enable_authenticated_access" ON products;

-- Create new policies for products
CREATE POLICY "allow_public_access"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_authenticated_access"
ON products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON products TO authenticated;