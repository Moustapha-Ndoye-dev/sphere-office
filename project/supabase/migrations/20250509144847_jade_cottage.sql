/*
  # Update reviews table RLS policies

  1. Changes
    - Modify the existing RLS policy to allow public read access to approved reviews
    - Keep the existing policy for creating reviews
    - Ensure only approved reviews are visible to the public

  2. Security
    - Public users can only view approved reviews
    - Anyone can submit a review
    - Reviews require approval before becoming visible
*/

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;

-- Create new SELECT policy for public access to approved reviews
CREATE POLICY "Public can view approved reviews"
ON reviews
FOR SELECT
TO public
USING (is_approved = true);

-- Keep existing INSERT policy
DROP POLICY IF EXISTS "Reviews can be created by anyone" ON reviews;
CREATE POLICY "Reviews can be created by anyone"
ON reviews
FOR INSERT
TO public
WITH CHECK (true);