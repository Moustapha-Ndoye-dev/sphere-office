import React from 'react';
import { Mail, Phone, MapPin, Send, Facebook, Instagram, Linkedin, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function Contact() {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Message envoyé avec succès !');
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: '',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section avec effet parallaxe */}
      <div className="relative h-[250px] sm:h-[300px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={settings?.contact_image || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&auto=format&fit=crop"}
            alt="Contact"
            className="w-full h-full object-cover transform scale-110"
            style={{ transform: 'scale(1.1)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50" />
        </div>
        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
              {settings?.location_title || 'Contactez-nous'}
            </h1>
            <p className="text-base sm:text-lg text-gray-200 leading-relaxed">
              Notre équipe est à votre écoute pour répondre à toutes vos questions et vous accompagner dans vos projets.
            </p>
          </div>
        </div>
      </div>

      {/* Section des coordonnées */}
      <div className="relative z-10 container mx-auto px-4 -mt-12 sm:-mt-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cartes d'information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 sm:p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-100 dark:bg-primary-900">
                  <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Téléphone</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">{settings?.location_phone || '+33 1 23 45 67 89'}</p>
                <a 
                  href={`tel:${settings?.location_phone}`}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/50 dark:hover:bg-primary-900 transition-colors"
                >
                  Appelez-nous
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 sm:p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-100 dark:bg-primary-900">
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Email</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">{settings?.location_email || 'contact@sphere-office.com'}</p>
                <a 
                  href={`mailto:${settings?.location_email}`}
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/50 dark:hover:bg-primary-900 transition-colors"
                >
                  Envoyez-nous un email
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 sm:p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-100 dark:bg-primary-900">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Adresse</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">{settings?.location_address || '111 Avenue Blaise Diagne, Dakar'}</p>
                <a 
                  href={settings?.location_link || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/50 dark:hover:bg-primary-900 transition-colors"
                >
                  Voir sur la carte
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 sm:p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-100 dark:bg-primary-900">
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">WhatsApp</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">{settings?.whatsapp_number || 'Contactez-nous sur WhatsApp'}</p>
                <a 
                  href={`https://wa.me/${settings?.whatsapp_number?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 mt-3 sm:mt-4 text-xs sm:text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/50 dark:hover:bg-primary-900 transition-colors"
                >
                  Discuter sur WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Formulaire */}
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 lg:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 sm:mb-8">
              Envoyez-nous un message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Sujet
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Envoyer le message
                </button>
              </div>
            </form>

            {/* Réseaux sociaux */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 text-center mb-6">
                Suivez-nous sur les réseaux sociaux
              </h3>
              <div className="flex justify-center space-x-6">
                <a 
                  href={settings?.facebook_url || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/50 dark:hover:text-primary-400 transition-colors"
                >
                  <Facebook className="h-6 w-6" />
                </a>
                <a 
                  href={settings?.instagram_url || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/50 dark:hover:text-primary-400 transition-colors"
                >
                  <Instagram className="h-6 w-6" />
                </a>
                <a 
                  href={settings?.linkedin_url || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-primary-100 hover:text-primary-600 dark:hover:bg-primary-900/50 dark:hover:text-primary-400 transition-colors"
                >
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}