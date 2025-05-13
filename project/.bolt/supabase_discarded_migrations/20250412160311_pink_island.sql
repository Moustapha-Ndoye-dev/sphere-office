-- Supprimer les anciennes fonctions de notification
DROP FUNCTION IF EXISTS create_order_notification() CASCADE;
DROP FUNCTION IF EXISTS create_status_change_notification() CASCADE;
DROP FUNCTION IF EXISTS create_low_stock_notification() CASCADE;
DROP FUNCTION IF EXISTS create_review_notification() CASCADE;

-- Recréer les fonctions avec le recipient_email et les bons statuts
CREATE OR REPLACE FUNCTION create_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    type,
    title,
    content,
    recipient_email,
    is_read,
    metadata
  ) VALUES (
    'order_placed',
    'Nouvelle commande #' || substring(NEW.id::text, 1, 8),
    'Une nouvelle commande de ' || NEW.total || ' XOF a été passée par ' || NEW.customer_name,
    'youneshachami9@gmail.com',
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

CREATE OR REPLACE FUNCTION create_status_change_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      recipient_email,
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
      'youneshachami9@gmail.com',
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

CREATE OR REPLACE FUNCTION create_low_stock_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= 5 AND (OLD.stock IS NULL OR OLD.stock > 5) THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      recipient_email,
      is_read,
      metadata
    ) VALUES (
      'low_stock',
      'Stock bas - ' || NEW.name,
      'Le produit ' || NEW.name || ' a un stock bas (' || NEW.stock || ' unités restantes)',
      'youneshachami9@gmail.com',
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

CREATE OR REPLACE FUNCTION create_review_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved IS NULL OR OLD.is_approved = false) THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      recipient_email,
      is_read,
      metadata
    )
    SELECT
      'review_approved',
      'Nouvel avis approuvé',
      'Un nouvel avis a été approuvé pour le produit ' || p.name,
      'youneshachami9@gmail.com',
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

-- Recréer les triggers
CREATE TRIGGER create_order_notification_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_notification();

CREATE TRIGGER create_status_change_notification_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_status_change_notification();

CREATE TRIGGER create_low_stock_notification_trigger
  AFTER INSERT OR UPDATE OF stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_low_stock_notification();

CREATE TRIGGER create_review_notification_trigger
  AFTER UPDATE OF is_approved ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION create_review_notification();

-- Mettre à jour les politiques de sécurité
DROP POLICY IF EXISTS "enable_all_access" ON notifications;
CREATE POLICY "enable_all_access"
ON notifications FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- S'assurer que les permissions sont correctement configurées
GRANT ALL ON notifications TO public;
GRANT ALL ON notifications TO authenticated;