import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'fr' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguage = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'fr',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'language-storage',
    }
  )
);

const translations = {
  fr: {
    common: {
      search: 'Rechercher',
      loading: 'Chargement...',
      error: 'Une erreur est survenue',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      add: 'Ajouter',
    },
    nav: {
      home: 'Accueil',
      products: 'Produits',
      categories: 'Catégories',
      about: 'À propos',
      contact: 'Contact',
      cart: 'Panier',
      admin: 'Administration',
    },
    products: {
      addToCart: 'Ajouter au panier',
      outOfStock: 'Rupture de stock',
      price: 'Prix',
      quantity: 'Quantité',
      description: 'Description',
      reviews: 'Avis',
      noReviews: 'Aucun avis',
    },
    cart: {
      empty: 'Votre panier est vide',
      total: 'Total',
      checkout: 'Commander',
      continue: 'Continuer mes achats',
    },
    footer: {
      description: 'Votre partenaire de confiance pour tous vos besoins en fournitures de bureau.',
      navigation: 'Navigation',
      contact: 'Contact',
      follow_us: 'Suivez-nous',
      rights: 'Tous droits réservés.',
    },
    contact: {
      title: 'Contactez-nous',
      info: {
        title: 'Nos coordonnées',
      },
      form: {
        title: 'Envoyez-nous un message',
      },
    },
    form: {
      name: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      address: 'Adresse',
      subject: 'Sujet',
      message: 'Message',
      send: 'Envoyer',
    },
  },
  en: {
    common: {
      search: 'Search',
      loading: 'Loading...',
      error: 'An error occurred',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
    },
    nav: {
      home: 'Home',
      products: 'Products',
      categories: 'Categories',
      about: 'About',
      contact: 'Contact',
      cart: 'Cart',
      admin: 'Admin',
    },
    products: {
      addToCart: 'Add to cart',
      outOfStock: 'Out of stock',
      price: 'Price',
      quantity: 'Quantity',
      description: 'Description',
      reviews: 'Reviews',
      noReviews: 'No reviews',
    },
    cart: {
      empty: 'Your cart is empty',
      total: 'Total',
      checkout: 'Checkout',
      continue: 'Continue shopping',
    },
    footer: {
      description: 'Your trusted partner for all your office supplies needs.',
      navigation: 'Navigation',
      contact: 'Contact',
      follow_us: 'Follow us',
      rights: 'All rights reserved.',
    },
    contact: {
      title: 'Contact Us',
      info: {
        title: 'Our Contact Information',
      },
      form: {
        title: 'Send us a message',
      },
    },
    form: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      subject: 'Subject',
      message: 'Message',
      send: 'Send',
    },
  },
};

export function getTranslation(key: string, language: Language = 'fr'): string {
  const keys = key.split('.');
  let value: any = translations[language];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}