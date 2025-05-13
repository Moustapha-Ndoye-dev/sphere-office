/*
  # Fix Authentication Policies
  
  1. Nettoyage complet des politiques existantes
  2. Mise en place de politiques simples et robustes
  3. Configuration correcte des permissions
*/

-- Suppression de toutes les politiques existantes
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_auth_all" ON products;
DROP POLICY IF EXISTS "allow_public_select" ON products;
DROP POLICY IF EXISTS "allow_auth_all" ON products;

-- Désactiver temporairement RLS
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Créer des politiques simples et claires
CREATE POLICY "products_select_policy"
ON products FOR SELECT
TO public
USING (true);

CREATE POLICY "products_all_policy"
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

-- Vérifier et recréer le trigger de slug si nécessaire
DROP TRIGGER IF EXISTS generate_product_slug_trigger ON products;
CREATE TRIGGER generate_product_slug_trigger
  BEFORE INSERT OR UPDATE OF name
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION generate_product_slug();