import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, Heart, MessageCircle, Phone, ShoppingCart, Truck } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductCard } from '../components/ui/ProductCard';
import { buildWhatsAppUrl, getPrimaryProductImage, getProductCategoryName, getProductImages, normalizePhoneForTel } from '../lib/site';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/utils';
import { getProductBySlug, getProductsByCategory } from '../services/products';
import { useCartStore } from '../store/cart';
import { useFavoritesStore } from '../store/favorites';
import { isOnOrderProduct, isSellableProduct } from '../lib/productAvailability';

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCartStore((state) => state.addItem);
  const { addItem: addToFavorites, removeItem: removeFromFavorites, isInFavorites } = useFavoritesStore();
  const [quantity, setQuantity] = React.useState(1);
  const [selectedImage, setSelectedImage] = React.useState(0);

  const { data: product, isLoading: isLoadingProduct, isError: isProductError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProductBySlug(slug!),
    enabled: !!slug,
    retry: false,
  });

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: () => getProductsByCategory(product!.category_id),
    enabled: !!product?.category_id,
  });

  React.useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
  }, [slug]);

  if (isLoadingProduct) {
    return (
      <div className="bg-slate-50 pb-20 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 2xl:px-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="h-80 animate-pulse rounded-[32px] bg-slate-200 sm:h-[420px] dark:bg-slate-800" />
            <div className="space-y-4">
              <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-3/4 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2 pt-4">
                <div className="h-3 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-4/6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-12 w-full animate-pulse rounded-full bg-slate-200 pt-4 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isProductError) {
    return (
      <div className="mx-auto w-full max-w-[1800px] px-4 py-12 sm:px-6 lg:px-8 2xl:px-12">
        <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Impossible de charger cette fiche produit.</h2>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            La page reste accessible, mais les donnees detaillees de ce produit ne repondent pas pour le moment.
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto w-full max-w-[1800px] px-4 py-12 sm:px-6 lg:px-8 2xl:px-12">
        <div className="empty-state-premium rounded-[30px] border border-dashed border-slate-300 px-6 py-16 text-center dark:border-slate-700">
          <p className="section-label justify-center">Produit</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Produit non trouve.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
            Cette fiche n'est plus disponible ou son lien a change.
          </p>
          <Link to="/products" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400">
            Retour a la boutique
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const images = getProductImages(product.images);
  const gallery = images.length > 0 ? images : [getPrimaryProductImage(product.images)];
  const mainImage = gallery[selectedImage] || gallery[0];
  const isFavorite = isInFavorites(product.id);
  const categoryName = getProductCategoryName(product);
  const isOnOrder = isOnOrderProduct(product);
  const isAvailable = isSellableProduct(product);
  const phone = settings?.location_phone || '+221 33 848 46 68';
  const whatsappUrl = buildWhatsAppUrl(
    settings?.whatsapp_number || phone,
    `Bonjour, je souhaite avoir plus d'informations sur "${product.name}". ${window.location.href}`
  );
  const filteredRelatedProducts = (relatedProducts || [])
    .filter((relatedProduct) => relatedProduct.id !== product.id)
    .slice(0, 3);
  const handleAddToCart = () => {
    if (!isAvailable) {
      toast.error('Ce produit est actuellement indisponible.');
      return;
    }

    for (let index = 0; index < quantity; index += 1) {
      addItem(product);
    }
    toast.success(`${quantity} article${quantity > 1 ? 's' : ''} ajoute${quantity > 1 ? 's' : ''} au panier.`);
  };

  return (
    <div className="product-detail-page bg-slate-50 pb-20 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8 2xl:px-12">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400 sm:mb-8 sm:text-xs sm:tracking-[0.18em]">
          <Link to="/products" className="-my-3.5 rounded-lg py-3.5 transition-colors hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:hover:text-sky-300">Boutique</Link>
          <span>/</span>
          <span>{categoryName}</span>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-200">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_28px_80px_-45px_rgba(15,23,42,0.45)] sm:rounded-[34px] sm:p-5 dark:border-slate-800 dark:bg-slate-900" data-reveal>
              <div className="overflow-hidden rounded-[20px] product-detail-img-bg sm:rounded-[28px]">
                <img
                  key={mainImage}
                  src={mainImage}
                  alt={product.name}
                  className="aspect-[4/3] w-full object-contain img-reveal"
                  loading="eager"
                />
              </div>
              {gallery.length > 1 ? (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {gallery.map((image, index) => (
                    <button
                      key={image}
                      onClick={() => setSelectedImage(index)}
                    className={`product-thumb-button overflow-hidden rounded-[14px] border p-1 transition-colors sm:rounded-[18px] ${
                        selectedImage === index
                          ? 'border-sky-500 bg-sky-50 dark:border-sky-400 dark:bg-sky-950/40'
                          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
                      }`}
                    >
                      <img src={image} alt={`${product.name} vue ${index + 1}`} loading="lazy" className="aspect-square w-full rounded-[10px] object-contain sm:rounded-[14px]" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start" data-reveal style={{ transitionDelay: '120ms' }}>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_28px_80px_-45px_rgba(15,23,42,0.45)] sm:rounded-[34px] sm:p-8 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-sky-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
                  {categoryName}
                </span>
                {!isOnOrder && product.sale_price ? (
                  <span className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    Offre
                  </span>
                ) : null}
                {isOnOrder && (
                  <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                    Disponible sur commande
                  </span>
                )}
              </div>

              <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl dark:text-white">{product.name}</h1>
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <span className={`text-2xl font-bold sm:text-3xl ${isOnOrder ? 'text-amber-700 dark:text-amber-300' : 'text-slate-950 dark:text-white'}`}>
                  {isOnOrder ? 'Prix sur demande' : formatPrice(product.sale_price ?? product.price)}
                </span>
                {!isOnOrder && product.sale_price ? (
                  <span className="text-lg text-slate-400 line-through">{formatPrice(product.price)}</span>
                ) : null}
              </div>

              {product.description ? (
                <p className="mt-6 text-base leading-8 text-slate-600 dark:text-slate-300">{product.description}</p>
              ) : null}

              <div className="mt-8 rounded-[22px] bg-slate-50 p-4 sm:rounded-[26px] sm:p-5 dark:bg-slate-950">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quantite</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {isOnOrder ? 'Disponible sur commande' : isAvailable ? 'En stock' : 'Indisponible'}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Diminuer la quantite"
                      className="rounded-full px-4 py-2 text-lg font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      -
                    </button>
                    <span className="min-w-[3rem] text-center text-base font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(100, quantity + 1))}
                      disabled={quantity >= 100}
                      aria-label="Augmenter la quantite"
                      className="rounded-full px-4 py-2 text-lg font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      +
                    </button>
                  </div>
                  {isOnOrder ? (
                    <Link
                      to={`/products/${product.slug}/request?quantity=${quantity}`}
                      className="inline-flex w-full flex-1 items-center justify-center rounded-full bg-amber-500 px-6 py-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 sm:w-auto"
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Demander ce produit
                    </Link>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      disabled={!isAvailable}
                      className="inline-flex w-full flex-1 items-center justify-center rounded-full bg-sky-900 px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:w-auto dark:bg-sky-500 dark:hover:bg-sky-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {isAvailable ? 'Ajouter au panier' : 'Indisponible'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => (isFavorite ? removeFromFavorites(product.id) : addToFavorites(product))}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-rose-400 hover:text-rose-600 dark:border-slate-700 dark:text-white dark:hover:border-rose-400 dark:hover:text-rose-300"
                >
                  <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-current text-rose-500' : ''}`} />
                  {isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Commander sur WhatsApp
                </a>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Livraison partout au Senegal</p>
                  <p className="mt-0.5 text-xs leading-5 text-emerald-700/80 dark:text-emerald-400/80">Dakar, banlieue et toutes les regions. Delai et frais confirmes lors de votre commande.</p>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4 sm:rounded-[26px] sm:p-5 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Besoin d'un conseil rapide ?</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Nous pouvons vous orienter sur la quantite, le style ou l'usage de ce produit pour votre bureau.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <a href={`tel:${normalizePhoneForTel(phone)}`} className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                    <Phone className="mr-2 h-4 w-4" />
                    Appeler
                  </a>
                  <Link to="/contact" className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-sky-400 hover:text-sky-800 dark:border-slate-700 dark:text-white dark:hover:border-sky-400 dark:hover:text-sky-300">
                    Ouvrir la page contact
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {filteredRelatedProducts.length > 0 ? (
          <section className="mt-20" data-reveal>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selection associee</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Completez l'espace.</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {filteredRelatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} size="small" />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
