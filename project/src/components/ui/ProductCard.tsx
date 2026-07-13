import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, Heart, ShoppingCart } from 'lucide-react';
import type { PublicProduct } from '../../services/products';
import { getPrimaryProductImage, getProductCategoryName } from '../../lib/site';
import { formatPrice } from '../../lib/utils';
import { useCartStore } from '../../store/cart';
import { useFavoritesStore } from '../../store/favorites';
import { isOnOrderProduct, isSellableProduct } from '../../lib/productAvailability';

type Product = PublicProduct;

interface ProductCardProps {
  product: Product;
  size?: 'small' | 'medium' | 'large' | 'featured';
}

export function ProductCard({ product, size = 'medium' }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { addItem: addToFavorites, removeItem: removeFromFavorites, isInFavorites } = useFavoritesStore();
  const isFavorite = isInFavorites(product.id);
  const imageUrl = getPrimaryProductImage(product.images);
  const categoryName = getProductCategoryName(product);
  const displayPrice = product.sale_price ?? product.price;
  const isOnOrder = isOnOrderProduct(product);
  const hasDiscount = !isOnOrder && Boolean(product.sale_price && product.price && product.sale_price < product.price);
  const isUnavailable = !isOnOrder && !isSellableProduct(product);

  const [isHovered, setIsHovered] = React.useState(false);
  const [cartAdded, setCartAdded] = React.useState(false);
  const [favoritePulse, setFavoritePulse] = React.useState(false);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFavorite) removeFromFavorites(product.id);
    else addToFavorites(product);
    setFavoritePulse(true);
    window.setTimeout(() => setFavoritePulse(false), 900);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSellableProduct(product)) return;
    addItem(product);
    setCartAdded(true);
    window.setTimeout(() => setCartAdded(false), 1400);
  };

  const imgAspect = size === 'large'
    ? 'aspect-[16/9]'
    : size === 'featured'
      ? 'aspect-[3/2]'
    : size === 'small'
      ? 'aspect-[4/3]'
      : 'aspect-[3/4]';
  const shouldContainImage = size === 'featured' || size === 'small';
  const imageBackground = shouldContainImage ? 'premium-product-media-bg' : '';
  const cardPadding = shouldContainImage ? 'p-2 sm:p-2.5' : '';

  return (
    <article
      className={`product-card-mobile premium-product-card card-shimmer group relative flex flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-white/95 ring-1 ring-white/70 dark:border-white/[0.07] dark:bg-slate-900 dark:ring-white/[0.03] sm:rounded-[22px] ${cardPadding}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0px)',
        boxShadow: isHovered
          ? '0 28px 72px -20px rgba(15,23,42,0.38), 0 0 0 1px rgba(14,165,233,0.22)'
          : '0 8px 32px -20px rgba(15,23,42,0.24)',
        transition: 'transform 0.42s cubic-bezier(0.16,1,0.3,1), box-shadow 0.42s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Image area */}
      <Link
        to={`/products/${product.slug}`}
        className={`product-card-image relative block ${imgAspect} ${imageBackground} overflow-hidden rounded-[15px] product-img-luxury focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:rounded-[18px]`}
        aria-label={product.name}
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="premium-product-image absolute inset-0 h-full w-full object-contain"
          style={{
            transform: isHovered ? `scale(${shouldContainImage ? '1.035' : '1.07'})` : 'scale(1)',
            transition: 'transform 0.75s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          loading="lazy"
        />

        {/* Cinematic vignette - darkens at bottom */}
        {!shouldContainImage ? (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.22) 38%, rgba(0,0,0,0) 65%)',
              opacity: isHovered ? 1 : 0.86,
              transition: 'opacity 0.45s ease',
            }}
          />
        ) : null}

        {/* Promo discount badge */}
        <div className="premium-product-badges">
          {hasDiscount ? (
            <span className="premium-product-badge is-sale">
              -{Math.round(100 - ((product.sale_price || product.price) / product.price) * 100)}%
            </span>
          ) : null}
          {isOnOrder ? (
            <span className="premium-product-badge is-on-order">Disponible sur commande</span>
          ) : null}
          {isUnavailable ? (
            <span className="premium-product-badge is-muted">Indisponible</span>
          ) : null}
        </div>

        {/* Out of stock */}
        {isUnavailable && (
          <div className="premium-product-unavailable absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <span className="rounded-full border border-white/30 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
              Indisponible
            </span>
          </div>
        )}

        {/* "Explorer" hover pill */}
        {!shouldContainImage ? (
          <div
            className="absolute bottom-[5.2rem] right-4 z-10 sm:bottom-[5.5rem]"
            style={{
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateY(0)' : 'translateY(7px)',
              transition: 'opacity 0.32s ease, transform 0.32s ease',
            }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm ring-1 ring-white/18">
              Explorer
              <Eye className="h-3 w-3" />
            </span>
          </div>
        ) : null}

        {/* Category + name overlaid at bottom */}
        {!shouldContainImage ? (
          <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-5">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-white/48">
              {categoryName}
            </p>
            <h3 className="font-display text-[0.9rem] font-semibold leading-snug text-white line-clamp-2 sm:text-[1.1rem]">
              {product.name}
            </h3>
          </div>
        ) : null}
      </Link>

      {/* Action bar */}
      <div className={shouldContainImage ? 'product-card-body flex flex-1 flex-col px-1.5 pb-1.5 pt-3' : 'product-card-body'}>
        {shouldContainImage ? (
          <div className="mb-auto">
            <p className="premium-product-category line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.2em]">
              {categoryName}
            </p>
            <h3 className="premium-product-title mt-1.5 line-clamp-2 text-sm font-semibold leading-[1.35] text-slate-900 transition-colors group-hover:text-sky-800 dark:text-white dark:group-hover:text-sky-300">
              {product.name}
            </h3>
          </div>
        ) : null}
        <div className={`product-card-actions flex items-center justify-between gap-2 ${
          shouldContainImage
            ? 'mt-3 border-t border-slate-100/80 pt-2.5 dark:border-slate-800'
            : 'px-3 py-2.5 sm:px-5 sm:py-4'
        }`}>
          <div className="min-w-0">
            {isOnOrder ? (
              <span className={`premium-product-price font-bold text-amber-700 dark:text-amber-300 ${shouldContainImage ? 'text-[11px] sm:text-[12px]' : 'text-sm sm:text-[1.05rem]'}`}>
                Prix sur demande
              </span>
            ) : product.sale_price ? (
              <div className="flex flex-wrap items-baseline gap-1">
                <span className={`premium-product-price font-bold text-sky-700 dark:text-sky-300 ${shouldContainImage ? 'text-[12px] sm:text-[13px]' : 'text-sm sm:text-[1.05rem]'}`}>
                  {formatPrice(product.sale_price)}
                </span>
                <span className={`text-slate-400 line-through ${shouldContainImage ? 'text-[10px]' : 'text-xs'}`}>
                  {formatPrice(product.price)}
                </span>
              </div>
            ) : (
              <span className={`premium-product-price font-bold text-slate-900 dark:text-white ${shouldContainImage ? 'text-[12px] sm:text-[13px]' : 'text-sm sm:text-[1.05rem]'}`}>
                {formatPrice(displayPrice)}
              </span>
            )}
          </div>

          {isOnOrder ? (
            <Link
              to={`/products/${product.slug}/request`}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-amber-500 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-950 shadow-sm transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
              aria-label={`Demander ${product.name}`}
            >
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Demander
            </Link>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={isUnavailable}
              className={`premium-product-cart relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-40 ${
                cartAdded
                  ? 'is-added scale-90 bg-emerald-500 text-white shadow-emerald-500/25'
                  : 'bg-sky-900 text-white hover:scale-105 hover:bg-sky-700 hover:shadow-sky-900/25 dark:bg-slate-700 dark:hover:bg-sky-600'
              }`}
              aria-label={`Ajouter ${product.name} au panier`}
            >
              {cartAdded ? (
                <svg className="h-4 w-4 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <ShoppingCart className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Favorite button */}
      <button
        onClick={toggleFavorite}
        className={`premium-product-favorite absolute z-20 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
          shouldContainImage ? 'right-1 top-1 sm:right-2 sm:top-2' : 'right-3 top-3'
        } ${
          isFavorite
            ? 'scale-110 bg-rose-500 text-white shadow-lg'
            : shouldContainImage
              ? 'bg-white/85 text-slate-400 shadow-sm ring-1 ring-slate-200/80 hover:scale-110 hover:bg-rose-500 hover:text-white dark:bg-slate-900/80 dark:text-slate-300 dark:ring-white/10'
              : 'bg-black/25 text-white/70 hover:scale-110 hover:bg-rose-500/90 hover:text-white ring-1 ring-white/15'
        } ${favoritePulse ? 'is-pulsing' : ''}`}
        aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart className={`transition-all duration-300 ${shouldContainImage ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-3.5 w-3.5'} ${isFavorite ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
}
