-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

-- Create new policies for notifications
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