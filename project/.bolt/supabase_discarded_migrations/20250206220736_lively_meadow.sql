-- Drop existing policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;

-- Create new policies for categories
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Anyone can create categories"
  ON categories FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "Anyone can update categories"
  ON categories FOR UPDATE
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete categories"
  ON categories FOR DELETE
  TO PUBLIC
  USING (true);

-- Grant necessary permissions
GRANT ALL ON categories TO PUBLIC;