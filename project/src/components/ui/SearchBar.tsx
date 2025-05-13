import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';

export function SearchBar() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: products } = useQuery({
    queryKey: ['search-products', searchTerm],
    queryFn: async () => {
      if (!searchTerm) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories!products_category_id_fkey(*)
        `)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: searchTerm.length > 0
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
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={searchRef} className="relative w-full">
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
          placeholder="Rechercher un produit..."
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100"
          aria-label="Rechercher un produit"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-describedby="search-description"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" aria-hidden="true" />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-1"
            aria-label="Effacer la recherche"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <span id="search-description" className="sr-only">
          Tapez pour rechercher des produits. Utilisez les flèches haut et bas pour naviguer dans les résultats.
        </span>
      </form>

      {isOpen && searchTerm && products && (
        <div
          id="search-results"
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          role="listbox"
        >
          <ul className="py-2 max-h-[60vh] overflow-y-auto">
            {products.length > 0 ? (
              products.map((product) => (
                <li key={product.id} role="option">
                  <button
                    onClick={() => {
                      navigate(`/products/${product.slug}`);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className="w-full px-4 py-2 flex items-center hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
                  >
                    <img
                      src={
                        Array.isArray(product.images) && product.images.length > 0
                          ? product.images[0]
                          : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'
                      }
                      alt=""
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="ml-4 flex-1 text-left">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {product.category?.name}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(product.sale_price || product.price)}
                    </div>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                Aucun résultat trouvé
              </li>
            )}
            {products.length > 0 && (
              <li className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
                    setIsOpen(false);
                  }}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                >
                  Voir tous les résultats
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}