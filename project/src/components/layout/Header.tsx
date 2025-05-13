import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Sun, Moon, Menu, Heart, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../store/theme';
import { useCartStore } from '../../store/cart';
import { useFavoritesStore } from '../../store/favorites';
import { SearchBar } from '../ui/SearchBar';
import { supabase } from '../../lib/supabase';

export function Header() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const cartItems = useCartStore((state) => state.items);
  const favoriteItems = useFavoritesStore((state) => state.items);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

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

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.menu-button')) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-950 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo and Menu Button */}
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="menu-button mr-4 p-2 lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
            <Link 
              to="/" 
              className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg"
              aria-label="Accueil"
            >
              {settings?.logo && (
                <img 
                  src={settings.logo} 
                  alt=""
                  className="h-8 w-auto"
                />
              )}
              <span className="text-xl font-bold text-primary-600 dark:text-primary-400 hidden sm:inline">
                Sphere Office
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8" aria-label="Navigation principale">
            <Link
              to="/products"
              className="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg px-3 py-2"
            >
              Produits
            </Link>
            <Link
              to="/about"
              className="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg px-3 py-2"
            >
              À propos
            </Link>
            <Link
              to="/contact"
              className="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg px-3 py-2"
            >
              Contact
            </Link>
          </nav>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:block flex-1 max-w-xl mx-4">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={isDarkMode ? "Activer le mode clair" : "Activer le mode sombre"}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link
              to="/favorites"
              className="p-2 text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={`Favoris (${favoriteItems.length})`}
            >
              <div className="relative">
                <Heart className="h-5 w-5" />
                {favoriteItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-xs flex items-center justify-center bg-primary-600 text-white rounded-full">
                    {favoriteItems.length}
                  </span>
                )}
              </div>
            </Link>
            <Link
              to="/cart"
              className="p-2 text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={`Panier (${cartItems.length} articles)`}
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 text-xs flex items-center justify-center bg-primary-600 text-white rounded-full">
                    {cartItems.length}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Search Bar - Mobile Only */}
        <div className="md:hidden pb-4">
          <SearchBar />
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`mobile-menu fixed inset-0 z-50 transform ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out lg:hidden`}
        style={{ top: '64px' }}
        aria-hidden={!isMenuOpen}
      >
        <div className="bg-white dark:bg-gray-900 h-full w-3/4 max-w-sm shadow-xl overflow-y-auto">
          <nav className="p-4" aria-label="Menu mobile">
            <div className="space-y-1">
              <Link
                to="/products"
                className="block w-full px-4 py-3 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Produits
              </Link>
              <Link
                to="/about"
                className="block w-full px-4 py-3 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setIsMenuOpen(false)}
              >
                À propos
              </Link>
              <Link
                to="/contact"
                className="block w-full px-4 py-3 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
          </nav>
        </div>
        <div 
          className="bg-black bg-opacity-50 h-full w-full" 
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      </div>
    </header>
  );
}