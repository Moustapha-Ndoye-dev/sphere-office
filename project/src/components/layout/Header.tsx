import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, Menu, Moon, Phone, ShoppingCart, Sun, Truck, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { normalizePhoneForTel } from '../../lib/site';
import { useCartStore } from '../../store/cart';
import { useFavoritesStore } from '../../store/favorites';
import { useThemeStore } from '../../store/theme';
import { useScrolled } from '../../hooks/useScrolled';
import { SearchBar } from '../ui/SearchBar';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/products', label: 'Boutique' },
  { to: '/about', label: 'A propos' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const cartItems = useCartStore((state) => state.items);
  const favoriteItems = useFavoritesStore((state) => state.items);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const scrolled = useScrolled(24);

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('.menu-button')) {
          setIsMenuOpen(false);
        }
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-500 ${
        scrolled
          ? 'border-slate-200/60 bg-white/95 shadow-[0_4px_32px_-8px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-slate-800/60 dark:bg-slate-950/95'
          : 'border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90'
      }`}
    >
      {/* Top bar */}
      <div
        className={`hidden border-b bg-slate-50/90 transition-all duration-500 sm:block dark:bg-slate-900/90 ${
          scrolled
            ? 'border-slate-100/60 dark:border-slate-800/60'
            : 'border-slate-200/70 dark:border-slate-800'
        }`}
      >
        <div className="desktop-topbar mx-auto flex min-h-12 w-full max-w-[1800px] items-center justify-center px-4 text-xs uppercase tracking-[0.14em] text-slate-500 sm:justify-between sm:px-6 sm:tracking-[0.16em] lg:px-8 2xl:px-12 dark:text-slate-400">
          <span className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <Truck className="h-3 w-3" />
            Livraison partout au Senegal
          </span>
          <div className="flex w-full items-center justify-between gap-3 py-2 sm:w-auto sm:justify-start sm:gap-4">
            {settings?.location_phone ? (
              <a
                href={`tel:${normalizePhoneForTel(settings.location_phone)}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 transition-all duration-200 hover:bg-white hover:text-sky-700 dark:hover:bg-slate-800/70 dark:hover:text-sky-300 group"
              >
                <Phone className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
                <span>{settings.location_phone}</span>
              </a>
            ) : null}
            <Link
              to="/contact"
              className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-sky-800 transition-colors hover:bg-white hover:text-sky-600 dark:text-sky-300 dark:hover:bg-slate-800/70 dark:hover:text-sky-200"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="mobile-header-shell mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 2xl:px-12">
        <div
          className={`mobile-header-row flex items-center justify-between gap-2 transition-all duration-500 sm:gap-4 ${
            scrolled ? 'h-[3.5rem] sm:h-[4.25rem]' : 'h-[3.75rem] sm:h-20'
          }`}
        >
          {/* Left: hamburger + logo */}
          <div className="mobile-logo-cluster flex min-w-0 items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="menu-button mr-1 hidden h-11 w-11 items-center justify-center rounded-xl md:flex lg:hidden hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:mr-4 transition-colors duration-200"
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="block transition-all duration-300">
                {isMenuOpen ? (
                  <X className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                ) : (
                  <Menu className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                )}
              </span>
            </button>

            <Link
              to="/"
              className="flex min-h-11 min-w-11 items-center justify-center space-x-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 sm:justify-start sm:space-x-3 group"
              aria-label="Accueil"
            >
              <img
                src={settings?.logo || '/assets/logo-sphere.png'}
                alt="Sphere Office"
                className={`w-auto object-contain transition-all duration-500 ${
                  scrolled ? 'h-7 sm:h-8' : 'h-8 sm:h-9'
                } max-w-[66px] sm:max-w-none`}
              />
              <span className="hidden sm:inline leading-none">
                <span
                  className={`font-display font-bold tracking-tight text-slate-950 dark:text-white transition-all duration-500 ${
                    scrolled ? 'text-xl' : 'text-[1.4rem]'
                  }`}
                >
                  Sphere
                </span>
                <span className={`font-display font-light text-sky-500 dark:text-sky-400 transition-all duration-500 ${scrolled ? 'text-xl' : 'text-[1.4rem]'}`}>·</span>
                <span className={`ml-1.5 font-sans font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 transition-all duration-500 ${scrolled ? 'text-[0.6rem]' : 'text-[0.65rem]'}`}>
                  Office
                </span>
              </span>
            </Link>
          </div>

          {/* Center: navigation */}
          <nav className="desktop-main-nav hidden items-center rounded-full border border-slate-200/70 bg-slate-50/80 p-1.5 shadow-inner shadow-white/80 lg:flex dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none" aria-label="Navigation principale">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none ${
                    isActive
                      ? 'bg-white text-sky-900 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-sky-200 dark:ring-slate-700'
                      : 'text-slate-500 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/75 dark:hover:text-slate-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Center: search bar */}
          <div className="mx-4 hidden max-w-2xl flex-1 md:block xl:mx-8">
            <SearchBar />
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center space-x-0.5 sm:space-x-2.5">
            <button
              onClick={toggleTheme}
              className="hidden h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-200 sm:flex"
              aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon className="h-5 w-5 transition-transform duration-300 hover:-rotate-12" />
              )}
            </button>

            <Link
              to="/favorites"
              className="hidden h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-rose-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all duration-200 sm:flex"
              aria-label={`Favoris (${favoriteItems.length})`}
            >
              <div className="relative">
                <Heart className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
                {favoriteItems.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-xs text-white font-bold animate-scale-in">
                    {favoriteItems.length}
                  </span>
                )}
              </div>
            </Link>

            <Link
              to="/cart"
              className="btn-magnetic hidden h-11 w-11 items-center justify-center rounded-full bg-sky-900 text-white hover:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors duration-200 shadow-md shadow-sky-900/20 md:flex"
              aria-label={`Panier (${cartItems.length} article${cartItems.length > 1 ? 's' : ''})`}
            >
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-sky-900 shadow animate-scale-in">
                    {cartItems.length}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="mobile-search-wrap pb-3 md:hidden">
          <SearchBar />
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`mobile-menu-shell fixed inset-x-0 top-[6.75rem] z-50 flex h-[calc(100dvh-6.75rem)] transform transition-all duration-300 ease-in-out sm:top-[11rem] sm:h-[calc(100dvh-11rem)] md:top-[7.5rem] md:h-[calc(100dvh-7.5rem)] lg:hidden ${
          isMenuOpen ? 'visible translate-x-0' : 'invisible -translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div className="mobile-menu-panel h-full w-[86%] max-w-sm shrink-0 overflow-y-auto bg-white shadow-2xl dark:bg-slate-900">
          <nav className="mobile-menu-nav p-5" aria-label="Menu mobile">
            <div className="mobile-menu-card rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50/40 p-5 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 font-medium">Sphere Office</p>
              <p className="mt-2.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Mobilier et fournitures de bureau premium pour les entreprises et les professionnels.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Truck className="h-3 w-3" />
                Livraison partout au Senegal
              </div>
            </div>

            <div className="mt-6 space-y-1">
              {NAV_ITEMS.map((item, i) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={({ isActive }) =>
                    `mobile-menu-link block w-full rounded-2xl px-5 py-3.5 text-base font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isActive
                        ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-300'
                    }`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="mobile-menu-contact mt-6 rounded-[28px] bg-gradient-to-br from-sky-950 to-sky-900 p-5 text-white dark:from-sky-700 dark:to-sky-600">
              <p className="text-[11px] uppercase tracking-[0.2em] text-sky-100/70 font-medium">Contact rapide</p>
              <p className="mt-2.5 text-base font-semibold">
                {settings?.location_phone || 'Besoin d\'un conseil ?'}
              </p>
              <Link
                to="/contact"
                className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-sky-900 transition-all hover:bg-sky-50 active:scale-95"
                onClick={() => setIsMenuOpen(false)}
              >
                Ouvrir la page contact
              </Link>
            </div>
          </nav>
        </div>
        <div
          className="h-full flex-1 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      </div>
    </header>
  );
}
