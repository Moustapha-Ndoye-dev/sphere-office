/*
  # Fix Policy Names
  
  1. Suppression des politiques existantes
  2. Création de nouvelles politiques avec des noms uniques
  3. Vérification des permissions
*/

-- Suppression de toutes les politiques existantes
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_all_policy" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_auth_all" ON products;
DROP POLICY IF EXISTS "allow_public_select" ON products;
DROP POLICY IF EXISTS "allow_auth_all" ON products;

-- Désactiver temporairement RLS
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Créer des politiques avec des noms uniques
CREATE POLICY "products_public_select_20250329"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "products_auth_all_20250329"
ON products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- S'assurer que les permissions sont correctement configurées
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON products TO public;
GRANT ALL ON products TO authenticated;

-- S'assurer que les séquences sont accessibles
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;