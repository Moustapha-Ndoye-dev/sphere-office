/*
  # Correction des politiques RLS pour les notifications
  
  1. Changements
    - Suppression des anciennes politiques
    - Création de nouvelles politiques plus permissives
    - Ajout des permissions nécessaires
*/

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON notifications;

-- Désactiver temporairement RLS
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Créer des politiques simples et permissives
CREATE POLICY "notifications_select_policy"
ON notifications FOR SELECT
TO public
USING (true);

CREATE POLICY "notifications_insert_policy"
ON notifications FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "notifications_update_policy"
ON notifications FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "notifications_delete_policy"
ON notifications FOR DELETE
TO public
USING (true);

-- S'assurer que les permissions sont correctement configurées
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON notifications TO public;
GRANT ALL ON notifications TO authenticated;

-- S'assurer que les séquences sont accessibles
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO public;