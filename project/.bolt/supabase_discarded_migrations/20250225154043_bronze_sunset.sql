-- Create enums
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered');

-- Create tables
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price decimal NOT NULL CHECK (price >= 0),
  sale_price decimal CHECK (sale_price >= 0),
  stock integer NOT NULL DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  images jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total decimal NOT NULL CHECK (total >= 0),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Categories are viewable by everyone" 
  ON categories FOR SELECT 
  TO PUBLIC 
  USING (true);

CREATE POLICY "Products are viewable by everyone" 
  ON products FOR SELECT 
  TO PUBLIC 
  USING (true);

CREATE POLICY "Orders can be created by anyone" 
  ON orders FOR INSERT 
  TO PUBLIC 
  WITH CHECK (true);

CREATE POLICY "Reviews can be created by anyone" 
  ON reviews FOR INSERT 
  TO PUBLIC 
  WITH CHECK (true);

CREATE POLICY "Reviews are viewable by everyone" 
  ON reviews FOR SELECT 
  TO PUBLIC 
  USING (is_approved = true);

-- Create indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Insert sample data
INSERT INTO categories (name, slug) VALUES
('Papeterie', 'papeterie'),
('Mobilier', 'mobilier'),
('Informatique', 'informatique'),
('Classement', 'classement');

INSERT INTO products (name, slug, description, price, category_id, images, stock)
SELECT 
  'Cahier A4 Premium',
  'cahier-a4-premium',
  'Cahier A4 de qualité supérieure, 96 pages',
  4.99,
  id,
  '["https://images.unsplash.com/photo-1517842645767-c639042777db?w=800"]',
  100
FROM categories WHERE slug = 'papeterie';

INSERT INTO products (name, slug, description, price, category_id, images, stock)
SELECT 
  'Bureau Ergonomique',
  'bureau-ergonomique',
  'Bureau ergonomique réglable en hauteur',
  299.99,
  id,
  '["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800"]',
  20
FROM categories WHERE slug = 'mobilier';