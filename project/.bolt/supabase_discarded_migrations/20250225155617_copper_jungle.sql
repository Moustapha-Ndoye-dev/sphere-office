-- Drop existing policies
DROP POLICY IF EXISTS "Public Access" ON storage.buckets;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- Create new policies for buckets
CREATE POLICY "Buckets are public"
ON storage.buckets FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can create buckets"
ON storage.buckets FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create new policies for objects
CREATE POLICY "Objects are public"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can insert objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete objects"
ON storage.objects FOR DELETE
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;