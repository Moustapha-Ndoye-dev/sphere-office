import React from 'react';
import { Building, Users, Award, Globe } from 'lucide-react';

export function About() {
  const values = [
    {
      icon: Building,
      title: 'Excellence',
      description: 'Nous nous engageons à fournir des produits de la plus haute qualité pour votre espace de travail.',
    },
    {
      icon: Users,
      title: 'Service client',
      description: 'Notre équipe dévouée est là pour vous accompagner et répondre à tous vos besoins.',
    },
    {
      icon: Award,
      title: 'Innovation',
      description: 'Nous recherchons constamment les dernières tendances et solutions pour améliorer votre environnement de travail.',
    },
    {
      icon: Globe,
      title: 'Durabilité',
      description: 'Nous nous engageons à minimiser notre impact environnemental à travers nos produits et pratiques.',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      {/* Section Hero */}
      <div className="text-center mb-10 sm:mb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
          À propos de Sphere Office
        </h1>
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-600 dark:text-gray-400">
          Votre partenaire de confiance pour tous vos besoins en fournitures de bureau depuis 2020.
        </p>
      </div>

      {/* Notre Histoire */}
      <section className="mb-16 sm:mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
              Notre Histoire
            </h2>
            <div className="space-y-3 sm:space-y-4 text-gray-600 dark:text-gray-400">
              <p className="text-sm sm:text-base">
                Fondée en 2020, Sphere Office est née de la vision d'offrir des solutions
                innovantes et durables pour l'aménagement des espaces de travail modernes.
              </p>
              <p className="text-sm sm:text-base">
                Notre mission est de transformer les environnements professionnels en
                espaces inspirants où la productivité et le bien-être se rencontrent.
              </p>
              <p className="text-sm sm:text-base">
                Aujourd'hui, nous sommes fiers de servir des milliers de clients à
                travers la France, des startups aux grandes entreprises.
              </p>
            </div>
          </div>
          <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg order-1 md:order-2">
            <img
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200"
              alt="Notre équipe"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Nos Valeurs */}
      <section className="mb-16 sm:mb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-8 sm:mb-12">
          Nos Valeurs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {values.map((value) => (
            <div
              key={value.title}
              className="bg-white dark:bg-gray-800 rounded-lg p-5 sm:p-6 text-center shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-lg mb-3 sm:mb-4">
                <value.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {value.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Chiffres Clés */}
      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 text-center mb-8 sm:mb-12">
          Chiffres Clés
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              10k+
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Clients Satisfaits
            </div>
          </div>
          <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              5k+
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Produits
            </div>
          </div>
          <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              24h
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Délai de Livraison
            </div>
          </div>
          <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl sm:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
              98%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Taux de Satisfaction
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}