-- Create notification types enum
CREATE TYPE notification_type AS ENUM (
  'order_placed',
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'low_stock',
  'review_approved'
);

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  recipient_email text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view notifications"
  ON notifications FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Anyone can update notifications"
  ON notifications FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Create function to create order notification
CREATE OR REPLACE FUNCTION create_order_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (type, title, content, recipient_email, metadata)
  VALUES (
    'order_placed',
    'Nouvelle commande #' || NEW.id,
    'Votre commande a été reçue et est en cours de traitement.',
    NEW.email,
    jsonb_build_object(
      'order_id', NEW.id,
      'total', NEW.total
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create low stock notification
CREATE OR REPLACE FUNCTION create_low_stock_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock <= 5 AND (OLD.stock IS NULL OR OLD.stock > 5) THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      recipient_email,
      metadata
    )
    SELECT
      'low_stock',
      'Stock bas - ' || name,
      'Le produit ' || name || ' a un stock bas (' || NEW.stock || ' unités restantes).',
      email,
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', name,
        'stock', NEW.stock
      )
    FROM auth.users
    WHERE email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create review notification
CREATE OR REPLACE FUNCTION create_review_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_approved = true AND (OLD.is_approved IS NULL OR OLD.is_approved = false) THEN
    INSERT INTO notifications (
      type,
      title,
      content,
      recipient_email,
      metadata
    )
    SELECT
      'review_approved',
      'Avis approuvé',
      'Votre avis sur le produit ' || p.name || ' a été approuvé.',
      r.customer_name,
      jsonb_build_object(
        'product_id', r.product_id,
        'product_name', p.name,
        'rating', r.rating
      )
    FROM reviews r
    JOIN products p ON p.id = r.product_id
    WHERE r.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER create_order_notification_trigger
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_notification();

CREATE TRIGGER create_low_stock_notification_trigger
  AFTER INSERT OR UPDATE OF stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION create_low_stock_notification();

CREATE TRIGGER create_review_notification_trigger
  AFTER UPDATE OF is_approved ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION create_review_notification();

-- Create indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_email);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);