-- Drop existing policies
DROP POLICY IF EXISTS "Orders can be created by anyone" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

-- Create new policies for orders
CREATE POLICY "Anyone can manage orders"
  ON orders FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Create new policies for order items
DROP POLICY IF EXISTS "Order items can be created by anyone" ON order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;

CREATE POLICY "Anyone can manage order items"
  ON order_items FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON orders TO PUBLIC;
GRANT ALL ON order_items TO PUBLIC;