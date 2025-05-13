-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "storage_buckets_public_read" ON storage.buckets;
DROP POLICY IF EXISTS "storage_objects_public_read" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_authenticated_access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.buckets;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Access" ON storage.objects;

-- Créer des politiques simples et claires
CREATE POLICY "allow_public_read_buckets"
ON storage.buckets FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_public_read_objects"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "allow_authenticated_write_objects"
ON storage.objects FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- S'assurer que le bucket products existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Donner les permissions nécessaires
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;