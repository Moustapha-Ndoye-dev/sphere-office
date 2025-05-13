-- Drop existing storage policies
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.buckets;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable full access to authenticated users" ON storage.objects;

-- Create bucket policies
CREATE POLICY "Public bucket access"
ON storage.buckets FOR SELECT
TO public
USING (true);

-- Create object policies
CREATE POLICY "Public object access"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can upload objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated users can update objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated users can delete objects"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- Ensure the products bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;