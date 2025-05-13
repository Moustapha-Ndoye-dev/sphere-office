-- Drop existing policies
DROP POLICY IF EXISTS "Buckets are public" ON storage.buckets;
DROP POLICY IF EXISTS "Authenticated users can create buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Objects are public" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;

-- Create bucket policies
CREATE POLICY "Enable read access for all users"
ON storage.buckets FOR SELECT
TO public
USING (true);

-- Create object policies
CREATE POLICY "Enable read access for all users"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable full access to authenticated users"
ON storage.objects FOR ALL 
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Grant permissions
GRANT ALL ON storage.buckets TO postgres, authenticated;
GRANT ALL ON storage.objects TO postgres, authenticated;

-- Ensure the products bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;