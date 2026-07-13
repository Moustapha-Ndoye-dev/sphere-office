import { ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavoritesStore } from '../store/favorites';
import { ProductCard } from '../components/ui/ProductCard';

export function Favorites() {
  const { items } = useFavoritesStore();

  if (items.length === 0) {
    return (
      <div className="empty-state-premium flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-6 px-4 py-16 bg-slate-50 dark:bg-slate-950">
        <div className="empty-state-orbit" aria-hidden="true" />
        <div className="empty-state-icon flex h-24 w-24 items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900">
          <Heart className="h-10 w-10 text-rose-500" />
        </div>
        <div className="max-w-[calc(100vw-2rem)] text-center">
          <p className="section-label justify-center">Favoris</p>
          <h2 className="break-words text-[1.35rem] font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
            Aucun favori pour l'instant
          </h2>
          <p className="mx-auto mt-2.5 max-w-xs text-sm leading-7 text-slate-500 dark:text-slate-400">
            Explorez notre catalogue et ajoutez les produits qui vous interessent.
          </p>
        </div>
        <div className="empty-state-pills" aria-label="Avantages favoris">
          <span>Selection privee</span>
          <span>Comparaison simple</span>
          <span>Achat plus rapide</span>
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
    <div className="bg-slate-50 pb-20 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-12">
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-rose-500" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Mes favoris
            </h1>
            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {items.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} size="small" />
          ))}
        </div>
      </div>
    </div>
  );
}
