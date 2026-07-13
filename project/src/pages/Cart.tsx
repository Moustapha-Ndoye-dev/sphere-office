import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, ShoppingBag, ShoppingCart, Truck } from 'lucide-react';
import { useCartStore } from '../store/cart';
import { CartItem } from '../components/ui/CartItem';
import { MobileCartItem } from '../components/mobile/MobileCartItem';
import { formatPrice } from '../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getProductsByIds } from '../services/products';

export function Cart() {
  const navigate = useNavigate();
  const {
    items,
    getSubtotal,
    getTotal,
    syncProducts,
  } = useCartStore((state) => ({
    items: state.items,
    getSubtotal: state.getSubtotal,
    getTotal: state.getTotal,
    syncProducts: state.syncProducts,
  }));

  const cartProductIds = React.useMemo(() => items.map((item) => item.product.id).sort(), [items]);
  const { data: currentProducts } = useQuery({
    queryKey: ['cart-products', cartProductIds],
    queryFn: () => getProductsByIds(cartProductIds),
    enabled: cartProductIds.length > 0,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (currentProducts) syncProducts(currentProducts);
  }, [currentProducts, syncProducts]);

  if (items.length === 0) {
    return (
      <div className="empty-state-premium flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <div className="empty-state-orbit" aria-hidden="true" />
        <div className="empty-state-icon flex h-24 w-24 items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900">
          <ShoppingBag className="h-10 w-10 text-sky-700 dark:text-sky-300" />
        </div>
        <div>
          <p className="section-label justify-center">Panier</p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Votre panier est vide
          </h2>
          <p className="mt-2.5 max-w-xs text-sm leading-7 text-slate-500 dark:text-slate-400">
            Parcourez notre catalogue et ajoutez les produits qui vous correspondent.
          </p>
        </div>
        <div className="empty-state-pills" aria-label="Avantages commande">
          <span>Devis rapide</span>
          <span>Livraison au Senegal</span>
          <span>Conseil pro</span>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center rounded-full bg-sky-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-800 active:scale-95 dark:bg-sky-500 dark:hover:bg-sky-400"
        >
          Explorer la boutique
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mobile-cart-page bg-slate-50 pb-28 dark:bg-slate-950 md:pb-10">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-12">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-sky-700 dark:text-sky-300" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Mon panier
            </h1>
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-900 dark:bg-sky-950/60 dark:text-sky-200">
              {items.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-12">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">

          {/* Articles */}
          <div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.2)] sm:rounded-[28px] sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {items.length} article{items.length > 1 ? 's' : ''}
              </p>
              <div className="max-h-[calc(100dvh-18rem)] divide-y-0 overflow-y-auto overscroll-contain pr-1 md:hidden">
                {items.map((item) => (
                  <MobileCartItem key={item.product.id} product={item.product} quantity={item.quantity} />
                ))}
              </div>
              <div className="hidden max-h-[calc(100dvh-16rem)] divide-y-0 overflow-y-auto overscroll-contain pr-1 md:block">
                {items.map((item) => (
                  <CartItem key={item.product.id} product={item.product} quantity={item.quantity} />
                ))}
              </div>
            </div>

            {/* Livraison badge */}
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <Truck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Livraison partout au Senegal - delai confirme a la commande
              </p>
            </div>

            <Link
              to="/products"
              className="mt-4 inline-flex items-center text-sm font-semibold text-sky-800 transition-colors hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
            >
              &lt;- Continuer mes achats
            </Link>
          </div>

          {/* Recapitulatif */}
          <div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.2)] sm:rounded-[28px] sm:p-6 lg:sticky lg:top-32 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Recapitulatif
              </p>

              {/* Lignes de prix */}
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Sous-total</span>
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatPrice(getSubtotal())}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                  <span>Livraison</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Partout au Senegal
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total</span>
                  <span className="text-xl font-bold tabular-nums text-sky-900 dark:text-sky-300">
                    {formatPrice(getTotal())}
                  </span>
                </div>
              </div>

              {/* CTA desktop */}
              <button
                onClick={() => navigate('/checkout')}
                className="mt-4 hidden w-full items-center justify-center gap-2 rounded-full bg-sky-900 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-800 active:scale-95 md:flex dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                Commander maintenant
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 hidden text-center text-[11px] text-slate-400 md:block dark:text-slate-500">
                <Lock className="mr-1 inline h-3 w-3" />
                Commande traitee en toute securite
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky checkout bar - mobile only */}
      <div className="mobile-sticky-cta bar-above-dock fixed inset-x-0 z-40 border-t border-slate-200/80 bg-white/96 px-4 py-3 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:hidden dark:border-slate-800/80 dark:bg-slate-950/96">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total</p>
            <p className="text-lg font-bold tabular-nums text-sky-900 dark:text-sky-300">
              {formatPrice(getTotal())}
            </p>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-800 active:scale-95 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Commander
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
