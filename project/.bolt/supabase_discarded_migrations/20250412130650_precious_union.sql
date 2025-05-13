/*
  # Ajout du champ pour le titre de l'onglet
  
  1. Nouveau champ
    - tab_title (text) : Titre affiché dans l'onglet du navigateur
*/

-- Ajout du nouveau champ
ALTER TABLE site_settings
ADD COLUMN tab_title text DEFAULT 'Sphere Office';