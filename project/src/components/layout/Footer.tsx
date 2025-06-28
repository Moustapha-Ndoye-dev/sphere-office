import React from 'react';
import { Link } from 'react-router-dom';

// Footer complet (desktop)
function DesktopFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* À propos */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">À propos</h4>
            <p className="text-gray-400 mb-4">
              Sphere Office, votre spécialiste en fournitures de bureau au Sénégal. Qualité, service et innovation pour votre espace de travail.
            </p>
            {/* Réseaux sociaux (à compléter si besoin) */}
            <div className="flex space-x-4 mt-2">
              {/* <a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a> */}
            </div>
          </div>
          {/* Liens rapides */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Liens rapides</h4>
            <ul className="space-y-2">
              <li><Link to="/products" className="text-gray-400 hover:text-white transition-colors">Nos produits</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/cart" className="text-gray-400 hover:text-white transition-colors">Panier</Link></li>
            </ul>
          </div>
          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <span className="text-primary-500 mt-0.5">📍</span>
                <span className="text-gray-400">111, Avenue Blaise Diagne<br />Dakar, Sénégal</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="text-primary-500">📞</span>
                <span className="text-gray-400">+221 33 848 46 68</span>
              </li>
              <li className="flex items-center space-x-3">
                <span className="text-primary-500">✉️</span>
                <span className="text-gray-400">ibrahimadiawo582@gmail.com</span>
              </li>
            </ul>
          </div>
          {/* Horaires */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Horaires d'ouverture</h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-3"><span className="text-primary-500">🕒</span><span className="text-gray-400">Lundi - Vendredi: 10h - 19h</span></li>
              <li className="flex items-center space-x-3"><span className="text-primary-500">🕒</span><span className="text-gray-400">Samedi: 10h - 17h</span></li>
              <li className="flex items-center space-x-3"><span className="text-primary-500">🕒</span><span className="text-gray-400">Dimanche: Fermé</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Sphere Office. Tous droits réservés.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">Politique de confidentialité</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">Conditions d'utilisation</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Footer mobile (Jumia style)
function MobileFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <footer className="bg-gray-900 text-gray-300 text-center pt-8 pb-4">
      <div className="mb-4">
        <button
          onClick={scrollToTop}
          className="mx-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <span>HAUT DE LA PAGE</span>
          <span className="text-lg">↑</span>
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4 text-sm">
        <Link to="/products" className="hover:text-primary-400 transition-colors">NOS PRODUITS</Link>
        <Link to="/about" className="hover:text-primary-400 transition-colors">À PROPOS</Link>
        <Link to="/contact" className="hover:text-primary-400 transition-colors">CONTACT</Link>
      </div>
      <div className="mb-4 text-sm text-gray-400">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-1">
          <span>📍 111, Avenue Blaise Diagne</span>
          <span>📞 +221 33 848 45 68</span>
          <span>✉️ ibrahimadiawo582@gmail.com</span>
        </div>
      </div>
      <hr className="border-gray-800 my-4 w-11/12 mx-auto" />
      <div className="text-xs text-gray-500">
        Tous Droits Réservés &copy; {new Date().getFullYear()} Sphere Office
      </div>
    </footer>
  );
}

// Composant principal qui choisit la version selon la taille d'écran
export function Footer() {
  // Utilisation d'un media query pour détecter le mobile
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile ? <MobileFooter /> : <DesktopFooter />;
}
