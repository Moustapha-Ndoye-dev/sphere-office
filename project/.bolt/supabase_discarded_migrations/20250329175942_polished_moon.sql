-- Drop existing product policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are editable by admins" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_authenticated_all" ON products;

-- Create new RLS policies for products
CREATE POLICY "enable_read_access_for_all_users"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_insert_for_authenticated_users"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "enable_update_for_authenticated_users"
ON products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_delete_for_authenticated_users"
ON products FOR DELETE
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT ALL ON products TO authenticated;