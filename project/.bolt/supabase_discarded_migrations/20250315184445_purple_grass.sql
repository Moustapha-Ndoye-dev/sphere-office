-- Drop existing policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are editable by admins" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_authenticated_all" ON products;

-- Create new policies for products
CREATE POLICY "products_public_read"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "products_authenticated_all"
ON products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON products TO authenticated;