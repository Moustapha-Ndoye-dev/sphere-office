-- Drop existing policies
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
DROP POLICY IF EXISTS "Products are editable by admins" ON products;
DROP POLICY IF EXISTS "allow_public_access" ON storage.buckets;
DROP POLICY IF EXISTS "allow_public_access" ON storage.objects;

-- Create new policies for products
CREATE POLICY "enable_public_access"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_authenticated_access"
ON products FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Create new storage policies
CREATE POLICY "enable_public_access"
ON storage.buckets FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_public_access"
ON storage.objects FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON products TO authenticated;
GRANT ALL ON storage.buckets TO public;
GRANT ALL ON storage.objects TO public;

-- Ensure products bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE
SET public = true;