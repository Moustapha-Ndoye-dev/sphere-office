import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Linkedin, Mail, Phone, ArrowUp, GitBranch as BrandTiktok, Clock, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function Footer() {
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* À propos */}
          <div>
            <div className="flex items-center mb-4">
              {settings?.logo ? (
                <img 
                  src={settings.logo} 
                  alt="Sphere Office"
                  className="h-8 w-auto mr-2"
                />
              ) : (
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Sphere Office
                </h3>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Votre partenaire de confiance pour tous vos besoins en fournitures de bureau.
            </p>
            <div className="flex items-center space-x-4">
              {settings?.facebook_url && (
                <a 
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {settings?.instagram_url && (
                <a 
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings?.linkedin_url && (
                <a 
                  href={settings.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              )}
              {settings?.tiktok_url && (
                <a 
                  href={settings.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  aria-label="TikTok"
                >
                  <BrandTiktok className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Navigation
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  Produits
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  Catégories
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  À propos
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Contact
            </h3>
            <ul className="space-y-3">
              {settings?.location_phone && (
                <li className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                  <a href={`tel:${settings.location_phone}`} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    {settings.location_phone}
                  </a>
                </li>
              )}
              {settings?.location_email && (
                <li className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                  <a href={`mailto:${settings.location_email}`} className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                    {settings.location_email}
                  </a>
                </li>
              )}
              <li className="flex items-center">
                <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                <span className="text-gray-600 dark:text-gray-400">
                  Ouvert de 8h à 18h
                </span>
              </li>
            </ul>
          </div>

          {/* Adresse */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Notre adresse
            </h3>
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  {settings?.location_address}
                </p>
                {settings?.location_link && (
                  <a 
                    href={settings.location_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    Voir sur la carte
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Sphere Office. Tous droits réservés.
            </p>
            <button
              onClick={scrollToTop}
              className="mt-4 md:mt-0 flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <span className="mr-2">Haut de la page</span>
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}