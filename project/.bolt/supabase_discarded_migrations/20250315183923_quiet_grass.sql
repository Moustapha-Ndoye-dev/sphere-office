-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "allow_public_access" ON storage.buckets;
DROP POLICY IF EXISTS "allow_public_access" ON storage.objects;

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

-- Créer une seule politique simple pour tout
CREATE POLICY "allow_public_access"
ON storage.buckets FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_public_access"
ON storage.objects FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- S'assurer que le bucket products existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Donner les permissions nécessaires
GRANT ALL ON storage.buckets TO public;
GRANT ALL ON storage.objects TO public;