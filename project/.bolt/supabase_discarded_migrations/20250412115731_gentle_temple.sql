/*
  # Fix products and categories relationship

  1. Changes
    - Drop and recreate the foreign key constraint between products and categories
    - Add explicit naming for the foreign key constraint
    
  2. Security
    - No changes to RLS policies
*/

-- Drop existing foreign key constraint if it exists
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- Recreate the foreign key constraint with explicit naming
ALTER TABLE products
ADD CONSTRAINT products_category_id_fkey
FOREIGN KEY (category_id) REFERENCES categories(id)
ON DELETE CASCADE;