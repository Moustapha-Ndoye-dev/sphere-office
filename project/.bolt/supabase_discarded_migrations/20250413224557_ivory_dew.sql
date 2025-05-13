/*
  # Ajout du statut des commandes
  
  1. Modifications
    - Ajout de la colonne status aux commandes
    - Mise à jour des contraintes et index
*/

-- Créer le type order_status s'il n'existe pas
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ajouter la colonne status à la table orders si elle n'existe pas
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN status order_status NOT NULL DEFAULT 'pending';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Créer un index sur la colonne status
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);

-- Mettre à jour les commandes existantes
UPDATE orders o
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM pos_transactions pt WHERE pt.order_id = o.id
  ) THEN 'confirmed'::order_status
  ELSE 'pending'::order_status
END
WHERE status = 'pending';

-- Ajouter une contrainte pour s'assurer que les commandes en caisse sont toujours confirmées
CREATE OR REPLACE FUNCTION check_pos_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pos_transactions WHERE order_id = NEW.id
  ) AND NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS ensure_pos_order_status ON orders;
CREATE TRIGGER ensure_pos_order_status
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_pos_order_status();

-- Accorder les permissions nécessaires
GRANT USAGE ON TYPE order_status TO public;
GRANT USAGE ON TYPE order_status TO authenticated;