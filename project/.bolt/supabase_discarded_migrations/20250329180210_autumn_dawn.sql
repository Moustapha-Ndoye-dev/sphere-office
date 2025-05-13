-- Drop existing policies
DROP POLICY IF EXISTS "enable_read_access_for_all_users" ON products;
DROP POLICY IF EXISTS "enable_insert_for_authenticated_users" ON products;
DROP POLICY IF EXISTS "enable_update_for_authenticated_users" ON products;
DROP POLICY IF EXISTS "enable_delete_for_authenticated_users" ON products;

-- Create new simplified policies
CREATE POLICY "allow_public_select"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_auth_all"
ON products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Ensure proper permissions
GRANT ALL ON products TO authenticated;
GRANT SELECT ON products TO public;

-- Ensure the trigger for slug generation runs after RLS checks
DROP TRIGGER IF EXISTS generate_product_slug_trigger ON products;
CREATE TRIGGER generate_product_slug_trigger
  BEFORE INSERT OR UPDATE OF name
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_slug();