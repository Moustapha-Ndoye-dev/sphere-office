import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import type { Database } from '../../types/database';
import { useCartStore } from '../../store/cart';
import { useFavoritesStore } from '../../store/favorites';
import { formatPrice } from '../../lib/utils';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductCardProps {
  product: Product;
  size?: 'small' | 'medium' | 'large';
}

export function ProductCard({ product, size = 'medium' }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { addItem: addToFavorites, removeItem: removeFromFavorites, isInFavorites } = useFavoritesStore();
  const isFavorite = isInFavorites(product.id);

  const imageUrl = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop';

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  const sizeClasses = {
    small: 'aspect-[3/4]',
    medium: 'aspect-[4/5]',
    large: 'aspect-[4/3]',
  };

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-100 dark:border-gray-700">
      <Link 
        to={`/products/${product.slug}`} 
        className="block focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-xl"
        aria-label={product.name}
      >
        <div className={`${sizeClasses[size]} h-40 sm:h-48 overflow-hidden relative`}> 
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {product.sale_price && (
            <span className="absolute top-2 left-2 bg-pink-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg z-10">Promo</span>
          )}
          {product.sale_price && product.price && (
            <span className="absolute top-2 right-2 bg-white/90 text-pink-600 text-xs font-bold px-1.5 py-0.5 rounded-full shadow z-10">
              -{Math.round(100 - (product.sale_price / product.price) * 100)}%
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={toggleFavorite}
        className={`absolute top-2 right-2 p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 z-20 shadow-md ${
          isFavorite
            ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
            : 'bg-white/80 text-gray-600 hover:text-red-600 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:text-red-400'
        }`}
        aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      <div className="p-3 sm:p-4">
        <Link
          to={`/products/${product.slug}`}
          className="block text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 truncate focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
        >
          {product.name}
        </Link>
        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 min-h-[32px]">{product.description}</p>
        )}
        <div className="mt-2 sm:mt-3 flex items-end justify-between">
          <div>
            {product.sale_price ? (
              <>
                <span className="text-base sm:text-lg font-bold text-pink-600 dark:text-pink-400">
                  {formatPrice(product.sale_price)}
                </span>
                <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-gray-400 line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
          <button
            onClick={() => addItem(product)}
            className="p-1.5 sm:p-2 text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-400 dark:hover:bg-primary-300 transition-colors rounded-full shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={`Ajouter ${product.name} au panier`}
          >
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}