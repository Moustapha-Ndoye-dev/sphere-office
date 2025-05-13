/*
  # Ajout des champs de réseaux sociaux aux paramètres du site
  
  1. Nouveaux champs
    - facebook_url (text) : Lien vers la page Facebook
    - instagram_url (text) : Lien vers le compte Instagram
    - linkedin_url (text) : Lien vers la page LinkedIn
    - whatsapp_number (text) : Numéro WhatsApp
*/

-- Ajout des nouveaux champs
ALTER TABLE site_settings
ADD COLUMN facebook_url text DEFAULT '',
ADD COLUMN instagram_url text DEFAULT '',
ADD COLUMN linkedin_url text DEFAULT '',
ADD COLUMN whatsapp_number text DEFAULT '';