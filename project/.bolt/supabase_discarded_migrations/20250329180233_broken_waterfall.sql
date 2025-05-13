/*
  # Simplification des politiques RLS pour les produits

  1. Changements
    - Suppression des anciennes politiques
    - Création d'une politique unique pour la lecture publique
    - Création d'une politique unique pour toutes les opérations authentifiées
    - Ajout des permissions nécessaires
*/

-- Drop all existing product policies
DROP POLICY IF EXISTS "allow_public_select" ON products;
DROP POLICY IF EXISTS "allow_auth_all" ON products;

-- Create single policy for public read access
CREATE POLICY "products_public_read"
ON products FOR SELECT
TO public
USING (true);

-- Create single policy for all authenticated operations
CREATE POLICY "products_auth_all"
ON products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant base permissions
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant specific permissions
GRANT SELECT ON products TO public;
GRANT ALL ON products TO authenticated;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;