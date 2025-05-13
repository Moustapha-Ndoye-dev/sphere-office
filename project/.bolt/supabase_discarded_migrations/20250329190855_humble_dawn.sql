-- Drop existing policies if they exist
DROP POLICY IF EXISTS "promotions_public_read" ON promotions;
DROP POLICY IF EXISTS "promotions_auth_all" ON promotions;

-- Create new policies with unique names
CREATE POLICY "promotions_select_20250329"
ON promotions FOR SELECT
TO public
USING (true);

CREATE POLICY "promotions_all_20250329"
ON promotions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO public;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON promotions TO public;
GRANT ALL ON promotions TO authenticated;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;