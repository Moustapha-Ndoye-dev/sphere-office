import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Palette } from 'lucide-react';

interface SiteSettings {
  logo: string;
  favicon: string;
  hero_image: string;
  about_image: string;
  contact_image: string;
  background_color: string;
  location_title: string;
  location_address: string;
  location_map_url: string;
  location_link: string;
  location_phone: string;
  location_email: string;
  facebook_url: string;
  instagram_url: string;
  linkedin_url: string;
  whatsapp_number: string;
  tab_title: string;
}

export function Settings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = React.useState<SiteSettings>({
    logo: '',
    favicon: '',
    hero_image: '',
    about_image: '',
    contact_image: '',
    background_color: '#ffffff',
    location_title: 'Notre localisation',
    location_address: '111 Avenue Blaise Diagne, Dakar, Sénégal',
    location_map_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3859.0517242430837!2d-17.43894492591767!3d14.693580185935772!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xec173c3d9c2f217%3A0xd246e6c924954cdc!2sAv.%20Blaise%20Diagne%2C%20Dakar%2C%20S%C3%A9n%C3%A9gal!5e0!3m2!1sfr!2sfr!4v1710510000000!5m2!1sfr!2sfr',
    location_link: 'https://goo.gl/maps/1234567890',
    location_phone: '+33 1 23 45 67 89',
    location_email: 'contact@sphere-office.com',
    facebook_url: '',
    instagram_url: '',
    linkedin_url: '',
    whatsapp_number: '',
    tab_title: 'Sphere Office',
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert(settings);

      if (error) throw error;
      toast.success('Paramètres enregistrés avec succès');
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Paramètres du site
      </h1>

      <div className="grid grid-cols-1 gap-8">
        {/* Images */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Images
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Logo
              </h3>
              <ImageUpload
                value={settings.logo ? [settings.logo] : []}
                onChange={(urls) => setSettings(prev => ({ ...prev, logo: urls[0] || '' }))}
                maxFiles={1}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Favicon
              </h3>
              <ImageUpload
                value={settings.favicon ? [settings.favicon] : []}
                onChange={(urls) => setSettings(prev => ({ ...prev, favicon: urls[0] || '' }))}
                maxFiles={1}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Image d'accueil
              </h3>
              <ImageUpload
                value={settings.hero_image ? [settings.hero_image] : []}
                onChange={(urls) => setSettings(prev => ({ ...prev, hero_image: urls[0] || '' }))}
                maxFiles={1}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Image "À propos"
              </h3>
              <ImageUpload
                value={settings.about_image ? [settings.about_image] : []}
                onChange={(urls) => setSettings(prev => ({ ...prev, about_image: urls[0] || '' }))}
                maxFiles={1}
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                Image de contact
              </h3>
              <ImageUpload
                value={settings.contact_image ? [settings.contact_image] : []}
                onChange={(urls) => setSettings(prev => ({ ...prev, contact_image: urls[0] || '' }))}
                maxFiles={1}
              />
            </div>
          </div>
        </div>

        {/* Apparence */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 pb-4 border-b dark:border-gray-700">
            <Palette className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Apparence
            </h2>
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Titre de l'onglet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Le titre qui apparaît dans l'onglet du navigateur
              </p>
              <input
                type="text"
                value={settings.tab_title}
                onChange={(e) => setSettings(prev => ({ ...prev, tab_title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                placeholder="Sphere Office"
              />
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Couleur de fond
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                La couleur de fond principale du site
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={settings.background_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, background_color: e.target.value }))}
                  className="h-12 w-24 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.background_color}
                  onChange={(e) => setSettings(prev => ({ ...prev, background_color: e.target.value }))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coordonnées */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Coordonnées
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre de la section localisation
              </label>
              <input
                type="text"
                value={settings.location_title}
                onChange={(e) => setSettings(prev => ({ ...prev, location_title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Adresse
              </label>
              <input
                type="text"
                value={settings.location_address}
                onChange={(e) => setSettings(prev => ({ ...prev, location_address: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lien Google Maps
              </label>
              <input
                type="text"
                value={settings.location_link}
                onChange={(e) => setSettings(prev => ({ ...prev, location_link: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Téléphone
              </label>
              <input
                type="text"
                value={settings.location_phone}
                onChange={(e) => setSettings(prev => ({ ...prev, location_phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={settings.location_email}
                onChange={(e) => setSettings(prev => ({ ...prev, location_email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numéro WhatsApp
              </label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="+33123456789"
              />
            </div>
          </div>
        </div>

        {/* Réseaux sociaux */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Réseaux sociaux
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Facebook
              </label>
              <input
                type="url"
                value={settings.facebook_url}
                onChange={(e) => setSettings(prev => ({ ...prev, facebook_url: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://facebook.com/votre-page"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instagram
              </label>
              <input
                type="url"
                value={settings.instagram_url}
                onChange={(e) => setSettings(prev => ({ ...prev, instagram_url: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://instagram.com/votre-compte"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                value={settings.linkedin_url}
                onChange={(e) => setSettings(prev => ({ ...prev, linkedin_url: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://linkedin.com/company/votre-entreprise"
              />
            </div>
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}