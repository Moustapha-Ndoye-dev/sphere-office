/*
  # Ajout des champs de localisation aux paramètres du site
  
  1. Nouveaux champs
    - location_title (text) : Titre de la section localisation
    - location_address (text) : Adresse complète
    - location_map_url (text) : URL de la carte Google Maps
    - location_link (text) : Lien vers Google Maps
    - location_phone (text) : Numéro de téléphone
    - location_email (text) : Adresse email

  2. Mise à jour des données existantes
    - Ajout de valeurs par défaut pour les nouveaux champs
*/

-- Ajout des nouveaux champs
ALTER TABLE site_settings
ADD COLUMN location_title text DEFAULT 'Notre localisation',
ADD COLUMN location_address text DEFAULT '111 Avenue Blaise Diagne, Dakar, Sénégal',
ADD COLUMN location_map_url text DEFAULT 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.0517242430837!2d-17.43894492591767!3d14.693580185935772!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xec173c3d9c2f217%3A0xd246e6c924954cdc!2sAv.%20Blaise%20Diagne%2C%20Dakar%2C%20S%C3%A9n%C3%A9gal!5e0!3m2!1sfr!2sfr!4v1710510000000!5m2!1sfr!2sfr',
ADD COLUMN location_link text DEFAULT 'https://goo.gl/maps/1234567890',
ADD COLUMN location_phone text DEFAULT '+33 1 23 45 67 89',
ADD COLUMN location_email text DEFAULT 'contact@sphere-office.com';