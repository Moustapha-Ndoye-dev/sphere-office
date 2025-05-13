-- Drop all existing storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.buckets;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Access" ON storage.objects;

-- Create new policies with unique names
CREATE POLICY "storage_buckets_public_read"
ON storage.buckets FOR SELECT
TO public
USING (true);

CREATE POLICY "storage_objects_public_read"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "storage_objects_authenticated_access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Ensure products bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;