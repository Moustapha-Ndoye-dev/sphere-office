/*
  # Add TikTok URL to site settings

  1. Changes
    - Add tiktok_url column to site_settings table with default empty string
*/

ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS tiktok_url text DEFAULT ''::text;