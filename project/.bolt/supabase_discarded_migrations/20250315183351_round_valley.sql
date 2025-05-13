-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "allow_public_read_buckets" ON storage.buckets;
DROP POLICY IF EXISTS "allow_public_read_objects" ON storage.objects;
DROP POLICY IF EXISTS "allow_authenticated_write_objects" ON storage.objects;

-- Créer des politiques simples
CREATE POLICY "enable_bucket_public_select"
ON storage.buckets FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_object_public_select"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "enable_object_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "enable_object_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "enable_object_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (true);

-- S'assurer que le bucket products existe et est public
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Donner les permissions nécessaires
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;