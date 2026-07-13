import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Search, Sun, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { isOnOrderProduct } from '../../lib/productAvailability';
import { useThemeStore } from '../../store/theme';

export function SearchBar() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const { data: products } = useQuery({
    queryKey: ['search-products', debouncedSearchTerm],
    queryFn: async () => {
      const safeSearchTerm = debouncedSearchTerm
        .slice(0, 80)
        .replace(/[,%_().]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (safeSearchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('public_products')
        .select(`
          id,
          name,
          slug,
          description,
          price,
          sale_price,
          availability,
          images,
          category_name
        `)
        .or(`name.ilike.%${safeSearchTerm}%,description.ilike.%${safeSearchTerm}%`)
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: debouncedSearchTerm.length >= 2,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm]);

  const selectProduct = (product: NonNullable<typeof products>[number]) => {
    navigate(`/products/${product.slug}`);
    setIsOpen(false);
    setSearchTerm('');
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!products?.length || !isOpen) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % products.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? products.length - 1 : current - 1));
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectProduct(products[activeIndex]);
    }
  };

  return (
    <div ref={searchRef} className="mobile-search relative w-full">
      <form onSubmit={handleSearch} role="search" className="relative">
        <input
          ref={inputRef}
          type="search"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un produit..."
          className="mobile-search-input min-h-11 w-full rounded-full border border-slate-200 bg-white/80 py-3 pl-10 pr-12 text-sm text-slate-900 shadow-[0_12px_35px_-28px_rgba(15,23,42,0.6)] outline-none ring-1 ring-white/70 transition-all placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:shadow-[0_18px_50px_-32px_rgba(14,116,144,0.55)] focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-white/[0.03] dark:focus:bg-slate-800"
          aria-label="Rechercher un produit"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-describedby="search-description"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${products?.[activeIndex]?.id}` : undefined}
        />
        <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" aria-hidden="true" />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-1.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:hover:text-slate-300"
            aria-label="Effacer la recherche"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <span id="search-description" className="sr-only">
          Tapez pour rechercher, utilisez les fleches pour parcourir les resultats, puis Entree pour ouvrir.
        </span>
      </form>

      <button
        type="button"
        onClick={toggleTheme}
        className="mobile-theme-toggle mobile-theme-toggle-standalone hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition-all hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:text-slate-300 dark:hover:text-sky-300 md:hidden"
        aria-label={isDarkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
        title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
      >
        {isDarkMode ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />}
      </button>

      {isOpen && searchTerm && products && (
        <div
          id="search-results"
          className="mobile-search-results absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-35px_rgba(15,23,42,0.35)] ring-1 ring-white/70 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/[0.04]"
          role="listbox"
        >
          <ul className="max-h-[60vh] overflow-y-auto py-2">
            {products.length > 0 ? (
              products.map((product, index) => (
                <li
                  key={product.id}
                  id={`search-result-${product.id}`}
                  role="option"
                  aria-selected={activeIndex === index}
                >
                  <button
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectProduct(product)}
                    className={`flex w-full items-center px-4 py-2.5 focus:outline-none ${
                      activeIndex === index
                        ? 'bg-sky-50 dark:bg-sky-950/30'
                        : 'hover:bg-slate-50 focus:bg-slate-50 dark:hover:bg-slate-800 dark:focus:bg-slate-800'
                    }`}
                  >
                    <img
                      src={
                        Array.isArray(product.images) && product.images.length > 0
                          ? product.images[0]
                          : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'
                      }
                      alt=""
                      className="h-12 w-12 rounded-xl object-contain"
                      loading="lazy"
                    />
                    <div className="ml-4 flex-1 text-left">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {product.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {product.category_name}
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {isOnOrderProduct(product) ? 'Prix sur demande' : formatPrice(product.sale_price ?? product.price)}
                    </div>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                Aucun resultat trouve
              </li>
            )}
            {products.length > 0 && (
              <li className="border-t border-slate-100 px-4 py-2 dark:border-slate-800">
                <button
                  onClick={() => {
                    navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
                    setIsOpen(false);
                  }}
                  className="w-full rounded-xl px-2 py-2 text-left text-sm font-semibold text-sky-700 hover:text-sky-900 focus:outline-none dark:text-sky-400 dark:hover:text-sky-200"
                >
                  Voir tous les resultats
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
