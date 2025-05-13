-- Create promotion types enum
CREATE TYPE promotion_discount_type AS ENUM ('percentage', 'fixed');

-- Create promotions table
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type promotion_discount_type NOT NULL,
  discount_value decimal NOT NULL CHECK (
    (discount_type = 'percentage' AND discount_value > 0 AND discount_value <= 100) OR
    (discount_type = 'fixed' AND discount_value > 0)
  ),
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create promotion_products table
CREATE TABLE promotion_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id, product_id)
);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Promotions are viewable by everyone" 
  ON promotions FOR SELECT 
  TO PUBLIC 
  USING (true);

CREATE POLICY "Promotions are editable by admins" 
  ON promotions FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
    )
  );

CREATE POLICY "Promotion products are viewable by everyone" 
  ON promotion_products FOR SELECT 
  TO PUBLIC 
  USING (true);

CREATE POLICY "Promotion products are editable by admins" 
  ON promotion_products FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
    )
  );

-- Create function to get active promotions
CREATE OR REPLACE FUNCTION get_active_promotions(product_id uuid)
RETURNS TABLE (
  promotion_id uuid,
  name text,
  discount_type promotion_discount_type,
  discount_value decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.discount_type,
    p.discount_value
  FROM promotions p
  JOIN promotion_products pp ON pp.promotion_id = p.id
  WHERE pp.product_id = $1
  AND p.start_date <= CURRENT_TIMESTAMP
  AND (p.end_date IS NULL OR p.end_date > CURRENT_TIMESTAMP)
  ORDER BY
    CASE
      WHEN p.discount_type = 'percentage' THEN p.discount_value
      ELSE p.discount_value / (
        SELECT price FROM products WHERE id = $1
      ) * 100
    END DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate final price
CREATE OR REPLACE FUNCTION calculate_final_price(product_id uuid)
RETURNS decimal AS $$
DECLARE
  base_price decimal;
  promo record;
BEGIN
  -- Get the base price (sale_price if exists, otherwise regular price)
  SELECT COALESCE(sale_price, price) INTO base_price
  FROM products
  WHERE id = product_id;

  -- Get the best active promotion
  SELECT * INTO promo
  FROM get_active_promotions(product_id);

  -- If no promotion, return base price
  IF promo IS NULL THEN
    RETURN base_price;
  END IF;

  -- Calculate final price based on promotion type
  RETURN CASE
    WHEN promo.discount_type = 'percentage' THEN
      ROUND(base_price * (1 - promo.discount_value / 100), 2)
    WHEN promo.discount_type = 'fixed' THEN
      GREATEST(0, ROUND(base_price - promo.discount_value, 2))
    ELSE base_price
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create indexes
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX idx_promotion_products_product ON promotion_products(product_id);