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

CREATE POLICY "Enable insert access for authenticated users"
ON storage.buckets FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create object policies
CREATE POLICY "Enable read access for all users"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON storage.objects FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users"
ON storage.objects FOR DELETE
TO authenticated
USING (true);

-- Grant permissions
GRANT ALL ON storage.buckets TO postgres, authenticated;
GRANT ALL ON storage.objects TO postgres, authenticated;

-- Ensure the products bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;