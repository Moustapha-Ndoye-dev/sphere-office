-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "enable_bucket_public_select" ON storage.buckets;
DROP POLICY IF EXISTS "enable_object_public_select" ON storage.objects;
DROP POLICY IF EXISTS "enable_object_insert" ON storage.objects;
DROP POLICY IF EXISTS "enable_object_update" ON storage.objects;
DROP POLICY IF EXISTS "enable_object_delete" ON storage.objects;

-- Créer le schéma storage s'il n'existe pas
CREATE SCHEMA IF NOT EXISTS storage;

-- Créer ou recréer les tables de base
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(bucket_id, name)
);

-- Activer RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Créer des politiques simples
CREATE POLICY "Lecture publique des buckets"
ON storage.buckets FOR SELECT
TO public
USING (true);

CREATE POLICY "Lecture publique des objets"
ON storage.objects FOR SELECT
TO public
USING (true);

CREATE POLICY "Gestion des objets pour utilisateurs authentifiés"
ON storage.objects FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- S'assurer que le bucket products existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Donner les permissions nécessaires
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;