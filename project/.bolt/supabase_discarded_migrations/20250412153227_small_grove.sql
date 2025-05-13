/*
  # Amélioration du système de notifications
  
  1. Ajout de triggers pour les notifications automatiques
    - Création de notifications pour les nouvelles commandes
    - Création de notifications pour les changements de statut
    - Création de notifications pour les stocks bas
    - Création de notifications pour les avis approuvés

  2. Ajout d'index pour améliorer les performances
*/

-- Fonction pour créer une notification de commande
CREATE OR REPLACE FUNCTION create_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    type,
    title,
    content,
    is_read,
    metadata
  ) VALUES (
    'order_placed',
    'Nouvelle commande #' || substring(NEW.id::text, 1, 8),
    'Une nouvelle commande de ' || NEW.total || ' XOF a été passée par ' || NEW.customer_name,
    false,
    jsonb_build_object(
      'order_id', NEW.id,
      'customer_name', NEW.customer_name,
      'total', NEW.total
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une notification de changement de statut
CREATE OR REPLACE FUNCTION create_status_change_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      is_read,
      metadata
    ) VALUES (
      'order_' || NEW.status,
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'Commande confirmée'
        WHEN NEW.status = 'shipped' THEN 'Commande expédiée'
        WHEN NEW.status = 'delivered' THEN 'Commande livrée'
        ELSE 'Statut de commande mis à jour'
      END || ' #' || substring(NEW.id::text, 1, 8),
      'La commande #' || substring(NEW.id::text, 1, 8) || ' est maintenant ' || 
      CASE 
        WHEN NEW.status = 'confirmed' THEN 'confirmée'
        WHEN NEW.status = 'shipped' THEN 'expédiée'
        WHEN NEW.status = 'delivered' THEN 'livrée'
        ELSE NEW.status
      END,
      false,
      jsonb_build_object(
        'order_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une notification de stock bas
CREATE OR REPLACE FUNCTION create_low_stock_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= 5 AND (OLD.stock IS NULL OR OLD.stock > 5) THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      is_read,
      metadata
    ) VALUES (
      'low_stock',
      'Stock bas - ' || NEW.name,
      'Le produit ' || NEW.name || ' a un stock bas (' || NEW.stock || ' unités restantes)',
      false,
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'stock', NEW.stock
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une notification d'avis approuvé
CREATE OR REPLACE FUNCTION create_review_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved IS NULL OR OLD.is_approved = false) THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      is_read,
      metadata
    )
    SELECT
      'review_approved',
      'Nouvel avis approuvé',
      'Un nouvel avis a été approuvé pour le produit ' || p.name,
      false,
      jsonb_build_object(
        'product_id', NEW.product_id,
        'product_name', p.name,
        'rating', NEW.rating
      )
    FROM products p
    WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
DROP TRIGGER IF EXISTS create_order_notification_trigger ON orders;
CREATE TRIGGER create_order_notification_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_notification();

DROP TRIGGER IF EXISTS create_status_change_notification_trigger ON orders;
CREATE TRIGGER create_status_change_notification_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_status_change_notification();

DROP TRIGGER IF EXISTS create_low_stock_notification_trigger ON products;
CREATE TRIGGER create_low_stock_notification_trigger
  AFTER INSERT OR UPDATE OF stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_low_stock_notification();

DROP TRIGGER IF EXISTS create_review_notification_trigger ON reviews;
CREATE TRIGGER create_review_notification_trigger
  AFTER UPDATE OF is_approved ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION create_review_notification();

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);