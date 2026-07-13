import React from 'react';
import { ClipboardList, Heart, Plus, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { PublicProduct } from '../../services/products';
import { formatPrice } from '../../lib/utils';
import { getPrimaryProductImage, getProductCategoryName } from '../../lib/site';
import { useCartStore } from '../../store/cart';
import { useFavoritesStore } from '../../store/favorites';
import { isOnOrderProduct, isSellableProduct } from '../../lib/productAvailability';

type Product = PublicProduct;

interface MobileProductCardProps {
  product: Product;
  compact?: boolean;
}

export function MobileProductCard({ product, compact = false }: MobileProductCardProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { addItem: addToFavorites, removeItem: removeFromFavorites, isInFavorites } = useFavoritesStore();
  const [cartAdded, setCartAdded] = React.useState(false);
  const [favoritePulse, setFavoritePulse] = React.useState(false);
  const isFavorite = isInFavorites(product.id);
  const imageUrl = getPrimaryProductImage(product.images);
  const categoryName = getProductCategoryName(product);
  const price = product.sale_price ?? product.price;
  const isOnOrder = isOnOrderProduct(product);
  const hasDiscount = !isOnOrder && Boolean(product.sale_price && product.price && product.sale_price < product.price);
  const isUnavailable = !isOnOrder && !isSellableProduct(product);

  const handleFavorite = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isFavorite) removeFromFavorites(product.id);
    else addToFavorites(product);
    setFavoritePulse(true);
    window.setTimeout(() => setFavoritePulse(false), 900);
  };

  const handleCart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isOnOrder) {
      navigate(`/products/${product.slug}/request`);
      return;
    }
    if (!isSellableProduct(product)) return;
    addItem(product);
    setCartAdded(true);
    window.setTimeout(() => setCartAdded(false), 1200);
  };

  return (
    <article className="mobile-app-product-card">
      <Link to={`/products/${product.slug}`} className="mobile-app-product-link" aria-label={product.name}>
        <div className="mobile-app-product-media">
          <img src={imageUrl} alt={product.name} loading="lazy" />
          {hasDiscount ? (
            <span className="mobile-app-product-badge">
              -{Math.round(100 - ((product.sale_price || product.price) / product.price) * 100)}%
            </span>
          ) : null}
          {isOnOrder ? (
            <span className="mobile-app-product-stock is-on-order">Disponible sur commande</span>
          ) : null}
          {isUnavailable ? (
            <span className="mobile-app-product-stock is-muted">Indisponible</span>
          ) : null}
          <button
            type="button"
            onClick={handleFavorite}
            className={`mobile-app-favorite ${isFavorite ? 'is-active' : ''} ${favoritePulse ? 'is-pulsing' : ''}`}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={isFavorite ? 'fill-current' : ''} />
          </button>
        </div>

        <div className="mobile-app-product-content">
          <p className="mobile-app-product-category">{categoryName}</p>
          <h3 className={compact ? 'is-compact' : ''}>{product.name}</h3>
          <div className="mobile-app-product-footer">
            <div className="min-w-0">
              <p className={`mobile-app-product-price ${isOnOrder ? 'text-amber-700 dark:text-amber-300' : ''}`}>
                {isOnOrder ? 'Prix sur demande' : formatPrice(price)}
              </p>
              {!isOnOrder && product.sale_price ? (
                <p className="mobile-app-product-old-price">{formatPrice(product.price)}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleCart}
              disabled={isUnavailable}
              className={`mobile-app-cart ${isOnOrder ? 'is-on-order' : ''} ${cartAdded ? 'is-added' : ''}`}
              aria-label={isOnOrder ? `Demander ${product.name}` : `Ajouter ${product.name} au panier`}
            >
              {isOnOrder ? (
                <>
                  <ClipboardList />
                  <span className="mobile-app-cart-label">Demander</span>
                </>
              ) : cartAdded ? <ShoppingBag /> : <Plus />}
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}
