import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Star, MessageCircle, Heart } from 'lucide-react';
import { getProductBySlug, getProductsByCategory } from '../services/products';
import { useCartStore } from '../store/cart';
import { useFavoritesStore } from '../store/favorites';
import { formatPrice } from '../lib/utils';
import { ProductCard } from '../components/ui/ProductCard';

// Numéro de téléphone du service client
const PHONE_NUMBER = '+33123456789'; // À remplacer par le vrai numéro

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const addItem = useCartStore((state) => state.addItem);
  const { addItem: addToFavorites, removeItem: removeFromFavorites, isInFavorites } = useFavoritesStore();
  const [quantity, setQuantity] = React.useState(1);

  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug!),
    enabled: !!slug,
  });

  const { data: relatedProducts, isLoading: isLoadingRelated } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: () => getProductsByCategory(product!.category_id),
    enabled: !!product?.category_id,
  });

  const contactSeller = () => {
    const message = `Bonjour, je suis intéressé(e) par le produit "${product?.name}" sur votre site. Pouvez-vous me donner plus d'informations ? ${window.location.href}`;
    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoadingProduct) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Produit non trouvé
        </p>
      </div>
    );
  }

  const imageUrl = Array.isArray(product.images) && product.images.length > 0
    ? product.images[0]
    : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=800&auto=format&fit=crop';

  const filteredRelatedProducts = relatedProducts?.filter(p => p.id !== product.id).slice(0, 4) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="aspect-square rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Catégorie: {product.category?.name}
            </p>
          </div>

          <div className="text-2xl font-bold">
            {product.sale_price ? (
              <>
                <span className="text-primary-600 dark:text-primary-400">
                  {formatPrice(product.sale_price)}
                </span>
                <span className="ml-2 text-lg text-gray-500 line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-gray-900 dark:text-gray-100">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-gray-600 dark:text-gray-400">
              {product.description}
            </p>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-300 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
              >
                -
              </button>
              <span className="px-4 py-2 text-gray-900 dark:text-gray-100">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
              >
                +
              </button>
            </div>

            <button
              onClick={() => {
                for (let i = 0; i < quantity; i++) {
                  addItem(product);
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              Ajouter au panier
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => isInFavorites(product.id) ? removeFromFavorites(product.id) : addToFavorites(product)}
              className="flex items-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              <Heart className={`h-5 w-5 ${isInFavorites(product.id) ? 'fill-current text-red-500' : ''}`} />
              {isInFavorites(product.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>

            <button
              onClick={contactSeller}
              className="flex items-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-primary-500 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Contacter le vendeur
            </button>
          </div>
        </div>
      </div>

      {/* Produits similaires */}
      {filteredRelatedProducts.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Produits similaires
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRelatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}