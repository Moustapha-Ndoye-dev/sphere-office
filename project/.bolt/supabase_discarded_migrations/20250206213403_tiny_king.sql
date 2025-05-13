-- Drop existing policies for orders
DROP POLICY IF EXISTS "Orders can be created by anyone" ON orders;

-- Create new policies for orders
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO PUBLIC
  USING (email = current_user OR current_user IS NULL);

-- Create policies for order items
CREATE POLICY "Order items can be created by anyone"
  ON order_items FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.email = current_user OR current_user IS NULL)
    )
  );