-- Ajout de toutes les colonnes nécessaires
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS location_title text DEFAULT 'Notre localisation',
ADD COLUMN IF NOT EXISTS location_address text DEFAULT '111 Avenue Blaise Diagne, Dakar, Sénégal',
ADD COLUMN IF NOT EXISTS location_phone text DEFAULT '+33 1 23 45 67 89',
ADD COLUMN IF NOT EXISTS location_email text DEFAULT 'contact@sphere-office.com',
ADD COLUMN IF NOT EXISTS location_link text DEFAULT 'https://goo.gl/maps/1234567890',
ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS linkedin_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT '',
ADD COLUMN IF NOT EXISTS tab_title text DEFAULT 'Sphere Office';

-- Mise à jour des valeurs par défaut pour les colonnes existantes
UPDATE site_settings
SET
  location_title = COALESCE(location_title, 'Notre localisation'),
  location_address = COALESCE(location_address, '111 Avenue Blaise Diagne, Dakar, Sénégal'),
  location_phone = COALESCE(location_phone, '+33 1 23 45 67 89'),
  location_email = COALESCE(location_email, 'contact@sphere-office.com'),
  location_link = COALESCE(location_link, 'https://goo.gl/maps/1234567890'),
  facebook_url = COALESCE(facebook_url, ''),
  instagram_url = COALESCE(instagram_url, ''),
  linkedin_url = COALESCE(linkedin_url, ''),
  whatsapp_number = COALESCE(whatsapp_number, ''),
  tab_title = COALESCE(tab_title, 'Sphere Office');