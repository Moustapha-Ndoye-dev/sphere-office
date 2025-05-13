-- Drop existing storage policies
DROP POLICY IF EXISTS "Public bucket access" ON storage.buckets;
DROP POLICY IF EXISTS "Public object access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update objects" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete objects" ON storage.objects;

-- Ensure storage extension is enabled
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA extensions;

-- Create products bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

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

CREATE POLICY "Authenticated users can manage objects"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO service_role;
GRANT ALL ON storage.objects TO service_role;

-- Create function to handle file uploads
CREATE OR REPLACE FUNCTION handle_storage_upload()
RETURNS trigger AS $$
BEGIN
  -- Set owner to current user
  NEW.owner = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for file uploads
DROP TRIGGER IF EXISTS on_storage_upload ON storage.objects;
CREATE TRIGGER on_storage_upload
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_storage_upload();