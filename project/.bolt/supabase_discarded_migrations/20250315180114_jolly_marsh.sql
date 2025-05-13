-- Drop all existing storage policies
DROP POLICY IF EXISTS "Public bucket access" ON storage.buckets;
DROP POLICY IF EXISTS "Public object access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage objects" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.buckets;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable full access to authenticated users" ON storage.objects;

-- Create clean policies
CREATE POLICY "Storage public access"
ON storage.buckets FOR SELECT
TO public
USING (true);

CREATE POLICY "Storage public read"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "Storage authenticated write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Storage authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

CREATE POLICY "Storage authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');

-- Ensure permissions are correct
GRANT USAGE ON SCHEMA storage TO public;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO service_role;
GRANT ALL ON storage.objects TO service_role;