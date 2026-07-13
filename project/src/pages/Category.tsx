import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CatalogSkeleton } from '../components/ui/CatalogSkeleton';
import { ProductCard } from '../components/ui/ProductCard';
import { supabase } from '../lib/supabase';
import { getProductsByCategory } from '../services/products';
import { compareProductsByPrice } from '../lib/productAvailability';

export function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [sortBy, setSortBy] = React.useState<'price-asc' | 'price-desc' | 'name'>('name');

  const { data: category, isLoading: isLoadingCategory, isError: isCategoryError } = useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Categorie invalide');
      const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    retry: false,
  });

  const { data: products, isLoading: isLoadingProducts, isError: isProductsError } = useQuery({
    queryKey: ['category-products', category?.id],
    queryFn: () => getProductsByCategory(category!.id),
    enabled: !!category?.id,
    retry: false,
  });

  const sortedProducts = React.useMemo(() => {
    return [...(products || [])].sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return compareProductsByPrice(a, b, 'asc');
        case 'price-desc':
          return compareProductsByPrice(a, b, 'desc');
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [products, sortBy]);

  if (isLoadingCategory || (!!category && isLoadingProducts)) {
    return (
      <div className="bg-slate-50 pb-20 dark:bg-slate-950">
        <CatalogSkeleton title="Chargement de la collection" subtitle="Nous organisons les produits de cette categorie." />
      </div>
    );
  }

  if (isCategoryError || isProductsError || !category) {
    return (
      <div className="mx-auto w-full max-w-[1800px] px-4 py-12 sm:px-6 lg:px-8 2xl:px-12">
        <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Categorie non trouvee.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
            Cette collection n'est plus disponible ou son lien a change.
          </p>
          <Link to="/products" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400">
            Retour a la boutique
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 pb-20 dark:bg-slate-950">
      <section className="grain-overlay border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4fa_50%,#e8eef7_100%)] py-12 sm:py-16 lg:py-20 dark:border-slate-800 dark:bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#1e293b_100%)]">
        <div className="mx-auto grid w-full max-w-[1800px] gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.45fr)] lg:items-end lg:px-8 2xl:px-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 sm:tracking-[0.22em] dark:text-sky-300">Collection</p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl md:text-5xl xl:text-6xl dark:text-white">
              {category.name}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:mt-6 sm:text-lg dark:text-slate-300">
              Une lecture plus claire des produits de cette collection, avec le meme niveau de presentation que le reste de la boutique.
            </p>
          </div>
          <div className="hidden rounded-[28px] border border-white/80 bg-white/70 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] backdrop-blur lg:block dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Selection active</p>
            <p className="mt-4 text-4xl font-bold text-sky-800 dark:text-sky-300">{sortedProducts.length}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">produit{sortedProducts.length > 1 ? 's' : ''} disponible{sortedProducts.length > 1 ? 's' : ''} dans cet univers.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-10 sm:px-6 lg:px-8 2xl:px-12">
        <div className="mb-8 flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.55)] ring-1 ring-white/70 backdrop-blur sm:rounded-[30px] sm:p-6 md:flex-row md:items-end md:justify-between dark:border-slate-800 dark:bg-slate-900/95 dark:ring-white/[0.03]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Collection</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950 sm:text-2xl dark:text-white">
              {sortedProducts.length} produit{sortedProducts.length > 1 ? 's' : ''} dans cette selection
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:w-auto dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="name">Nom</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix decroissant</option>
            </select>
            <Link to="/products" className="inline-flex items-center justify-center rounded-full bg-sky-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400">
              Voir toute la boutique
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">Aucun produit dans cette categorie.</h3>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Revenez a la boutique pour parcourir le reste du catalogue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
