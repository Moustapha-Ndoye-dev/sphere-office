/*
  # Ajout de la table site_settings et des politiques

  1. Nouvelle Table
    - site_settings
      - id (uuid, primary key)
      - logo (text)
      - favicon (text)
      - hero_image (text)
      - about_image (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Sécurité
    - Enable RLS
    - Policies pour la lecture publique
    - Policies pour l'édition par les admins
*/

-- Create site_settings table
CREATE TABLE site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo text,
  favicon text,
  hero_image text,
  about_image text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view site settings"
  ON site_settings FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Only admins can edit site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
    )
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert initial settings
INSERT INTO site_settings (logo, favicon, hero_image, about_image)
VALUES ('', '', '', '');

-- Update storage policies
DROP POLICY IF EXISTS "Enable full access to authenticated users" ON storage.objects;

CREATE POLICY "Enable full access to authenticated users"
ON storage.objects FOR ALL 
TO authenticated
USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Create indexes
CREATE INDEX idx_site_settings_updated ON site_settings(updated_at);