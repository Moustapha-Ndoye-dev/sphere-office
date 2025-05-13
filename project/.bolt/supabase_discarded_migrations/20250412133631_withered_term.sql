-- Insérer les paramètres initiaux s'ils n'existent pas
INSERT INTO site_settings (
  logo,
  favicon,
  hero_image,
  about_image,
  contact_image,
  background_color,
  location_title,
  location_address,
  location_phone,
  location_email,
  location_link,
  facebook_url,
  instagram_url,
  linkedin_url,
  whatsapp_number,
  tab_title
)
SELECT
  '',
  '',
  '',
  '',
  '',
  '#ffffff',
  'Notre localisation',
  '111 Avenue Blaise Diagne, Dakar, Sénégal',
  '+33 1 23 45 67 89',
  'contact@sphere-office.com',
  'https://goo.gl/maps/1234567890',
  '',
  '',
  '',
  '',
  'Sphere Office'
WHERE NOT EXISTS (
  SELECT 1 FROM site_settings
);