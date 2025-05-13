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

-- Create promotion_products table for many-to-many relationship
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

CREATE POLICY "Promotion products are viewable by everyone" 
  ON promotion_products FOR SELECT 
  TO PUBLIC 
  USING (true);

-- Create indexes
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotion_products_promotion ON promotion_products(promotion_id);
CREATE INDEX idx_promotion_products_product ON promotion_products(product_id);

-- Insert sample data
INSERT INTO promotions (name, description, discount_type, discount_value, start_date, end_date)
VALUES (
  'Soldes d''été',
  'Profitez de nos soldes d''été !',
  'percentage',
  20,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days'
);

-- Link promotions to products
INSERT INTO promotion_products (promotion_id, product_id)
SELECT 
  promotions.id,
  products.id
FROM promotions
CROSS JOIN products
WHERE promotions.name = 'Soldes d''été'
AND products.name IN ('Bureau Ergonomique', 'Cahier A4 Premium');