-- Supprimer les colonnes existantes
ALTER TABLE site_settings
DROP COLUMN IF EXISTS location_title,
DROP COLUMN IF EXISTS location_address,
DROP COLUMN IF EXISTS location_map_url,
DROP COLUMN IF EXISTS location_phone,
DROP COLUMN IF EXISTS location_email;

-- Ajouter uniquement la colonne location_link
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS location_link text DEFAULT 'https://goo.gl/maps/1234567890';