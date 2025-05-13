-- Drop table if it exists
DROP TABLE IF EXISTS notifications;

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  recipient_email text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Anyone can view notifications"
  ON notifications FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Anyone can update notifications"
  ON notifications FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Insert some test notifications
INSERT INTO notifications (type, title, content, recipient_email, metadata)
VALUES
  (
    'low_stock',
    'Stock bas - Bureau Ergonomique',
    'Le produit Bureau Ergonomique a un stock bas (20 unités restantes).',
    'youneshachami9@gmail.com',
    jsonb_build_object(
      'product_id', (SELECT id FROM products WHERE slug = 'bureau-ergonomique'),
      'product_name', 'Bureau Ergonomique',
      'stock', 20
    )
  ),
  (
    'review_approved',
    'Nouvel avis approuvé',
    'Un nouvel avis a été approuvé pour le Bureau Ergonomique',
    'youneshachami9@gmail.com',
    jsonb_build_object(
      'product_id', (SELECT id FROM products WHERE slug = 'bureau-ergonomique'),
      'product_name', 'Bureau Ergonomique',
      'rating', 5
    )
  );