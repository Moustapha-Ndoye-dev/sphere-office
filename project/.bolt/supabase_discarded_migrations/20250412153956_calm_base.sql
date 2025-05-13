/*
  # Correction des politiques RLS pour les notifications et les commandes
  
  1. Changements
    - Suppression des anciennes politiques
    - Création de nouvelles politiques plus permissives
    - Ajout des permissions nécessaires
*/

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON notifications;

-- Désactiver temporairement RLS
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Créer des politiques simples et permissives
CREATE POLICY "enable_all_access"
ON notifications FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- S'assurer que les permissions sont correctement configurées
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON notifications TO public;
GRANT ALL ON notifications TO authenticated;

-- S'assurer que les séquences sont accessibles
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;

-- Supprimer les anciennes politiques des commandes
DROP POLICY IF EXISTS "Orders can be created by anyone" ON orders;
DROP POLICY IF EXISTS "Orders are viewable by admins" ON orders;

-- Créer des politiques permissives pour les commandes
CREATE POLICY "enable_orders_access"
ON orders FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Accorder les permissions nécessaires pour les commandes
GRANT ALL ON orders TO public;
GRANT ALL ON orders TO authenticated;