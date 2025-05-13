/*
  # Gestion des stocks

  1. Modifications
    - Ajout de contraintes sur les stocks
    - Ajout de triggers pour la mise à jour automatique des stocks
    - Ajout de fonctions pour la vérification des stocks

  2. Sécurité
    - Mise à jour des policies existantes
*/

-- Add stock constraints
ALTER TABLE products
ADD CONSTRAINT check_stock_non_negative
CHECK (stock >= 0);

-- Create function to check stock availability
CREATE OR REPLACE FUNCTION check_stock_availability(product_id uuid, quantity integer)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM products
    WHERE id = product_id
    AND stock >= quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update stock after order
CREATE OR REPLACE FUNCTION update_stock_after_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we have enough stock
  IF NOT EXISTS (
    SELECT 1
    FROM products
    WHERE id = NEW.product_id
    AND stock >= NEW.quantity
  ) THEN
    RAISE EXCEPTION 'Stock insuffisant pour le produit %', NEW.product_id;
  END IF;

  -- Update stock
  UPDATE products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update stock
CREATE TRIGGER update_stock_after_order_trigger
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_after_order();