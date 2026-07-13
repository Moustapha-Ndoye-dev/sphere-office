import React from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ui/ProductCard';
import { CatalogSkeleton } from '../components/ui/CatalogSkeleton';
import { MobileProductCard } from '../components/mobile/MobileProductCard';
import { Pagination } from '../components/ui/Pagination';
import { formatPrice } from '../lib/utils';
import { getCategories, getProducts } from '../services/products';
import { compareProductsByPrice, getEffectiveProductPrice, isOnOrderProduct } from '../lib/productAvailability';

const DEFAULT_MAX_PRICE = 1000000;

export function Products() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [priceRange, setPriceRange] = React.useState<[number, number]>([0, DEFAULT_MAX_PRICE]);
  const [sortBy, setSortBy] = React.useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(24);
  const [isMobileViewport, setIsMobileViewport] = React.useState(() => window.matchMedia('(max-width: 767px)').matches);

  const { data: productsData, isLoading: isLoadingProducts, isError: isProductsError } = useQuery({
    queryKey: ['products', searchQuery],
    queryFn: async () => {
      const result = await getProducts(1, 200);
      const query = searchQuery.trim().toLowerCase();
      if (!query) return result.data;
      return result.data.filter((product) => (
        product.name.toLowerCase().includes(query) ||
        (product.description || '').toLowerCase().includes(query)
      ));
    },
    placeholderData: keepPreviousData,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const maxCatalogPrice = React.useMemo(() => {
    const prices = (productsData || [])
      .map((product) => getEffectiveProductPrice(product))
      .filter((price): price is number => price !== null);
    return Math.max(DEFAULT_MAX_PRICE, ...prices);
  }, [productsData]);

  const filteredProducts = React.useMemo(() => {
    return (productsData || [])
      .filter((product) => {
        const price = getEffectiveProductPrice(product);
        return (!selectedCategory || product.category_id === selectedCategory)
          && (isOnOrderProduct(product) || (price !== null && price >= priceRange[0] && price <= priceRange[1]));
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return compareProductsByPrice(a, b, 'asc');
        if (sortBy === 'price-desc') return compareProductsByPrice(a, b, 'desc');
        return a.name.localeCompare(b.name);
      });
  }, [priceRange, productsData, selectedCategory, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = React.useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, pageSize, safePage]);

  const resetFilters = () => {
    setSelectedCategory('');
    setPriceRange([0, maxCatalogPrice]);
    setSortBy('name');
  };

  const activeFiltersCount =
    Number(Boolean(selectedCategory))
    + Number(priceRange[0] > 0 || priceRange[1] < maxCatalogPrice)
    + Number(sortBy !== 'name');

  React.useEffect(() => {
    setPriceRange((current) => {
      if (current[1] === DEFAULT_MAX_PRICE || current[1] > maxCatalogPrice) {
        return [current[0], maxCatalogPrice];
      }
      return current;
    });
  }, [maxCatalogPrice]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [priceRange, searchQuery, selectedCategory, sortBy]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  React.useEffect(() => {
    if (!isMobileFiltersOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileFiltersOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMobileFiltersOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileFiltersOpen]);

  return (
    <div className="mobile-products-page bg-slate-50 dark:bg-slate-950">

      {/* ── Page hero ──────────────────────────────────────────── */}
      <section className="mobile-app-catalog-hero md:hidden">
        <div>
          <span>Boutique</span>
          <h1>Choisissez vite, commandez mieux.</h1>
          <p>{productsData?.length ?? 0} produits disponibles, organises pour trouver le bon article sans friction.</p>
        </div>
      </section>

      <section className="mobile-catalog-hero hidden grain-overlay border-b border-slate-200/60 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4fa_50%,#e8eef7_100%)] py-10 md:block sm:py-16 lg:py-20 dark:border-slate-800/60 dark:bg-[linear-gradient(135deg,#020617_0%,#0f172a_50%,#1e293b_100%)]">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.4fr)] lg:items-end xl:gap-12">
            <div>
              <p className="section-label" data-reveal>Boutique</p>
              <h1
                className="mt-3 font-display text-[1.7rem] font-bold leading-[1.08] tracking-tight text-slate-950 sm:mt-5 sm:text-4xl md:text-5xl xl:text-6xl dark:text-white"
                data-reveal
                data-delay="80"
              >
                Une selection premium,<br className="hidden sm:block" /> branchee sur les vrais produits du catalogue.
              </h1>
              <p
                className="mt-4 hidden text-base leading-7 text-slate-600 sm:mt-5 sm:block sm:text-lg sm:leading-8 dark:text-slate-300"
                data-reveal
                data-delay="160"
              >
                Retrouvez un catalogue clair et lisible pour choisir rapidement les produits adaptes a vos besoins.
              </p>
            </div>

            {/* Stats card */}
            <div
              className="hidden rounded-[26px] border border-white/80 bg-white/72 p-5 shadow-[0_24px_72px_-44px_rgba(15,23,42,0.5)] backdrop-blur-lg lg:block dark:border-slate-800 dark:bg-slate-900/70"
              data-reveal="fade-right"
              data-delay="100"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Experience achat</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-[18px] bg-slate-50/90 p-4 dark:bg-slate-950">
                  <p className="text-2xl font-extrabold text-sky-800 dark:text-sky-300">
                    {productsData?.length ?? '—'}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Produits</p>
                </div>
                <div className="rounded-[18px] bg-slate-50/90 p-4 dark:bg-slate-950">
                  <p className="text-2xl font-extrabold text-sky-800 dark:text-sky-300">
                    {categories?.length ?? '—'}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Univers</p>
                </div>
                <div className="rounded-[18px] bg-slate-50/90 p-4 dark:bg-slate-950">
                  <p className="text-2xl font-extrabold text-sky-800 dark:text-sky-300">B2B</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Conseil</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main catalog area ──────────────────────────────────── */}
      <div className="mobile-catalog-shell mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-10 lg:px-8 2xl:px-12">

        {/* Mobile filter toggle */}
        <div className="mb-4 lg:hidden">
          <button
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
            className="mobile-filter-toggle inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-md shadow-slate-900/8 backdrop-blur-xl transition-all hover:border-sky-400 hover:text-sky-800 dark:border-slate-700 dark:bg-slate-900/90 dark:text-white dark:hover:border-sky-400"
          >
            {isMobileFiltersOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <SlidersHorizontal className="h-4 w-4" />
            )}
            {isMobileFiltersOpen ? 'Fermer les filtres' : 'Filtres'}
            {activeFiltersCount > 0 && !isMobileFiltersOpen ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-900 px-1 text-[10px] font-bold text-white dark:bg-sky-500 dark:text-slate-950">
                {activeFiltersCount}
              </span>
            ) : null}
          </button>
        </div>

        {/* Backdrop overlay */}
        {isMobileFiltersOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-[39] bg-slate-950/35 backdrop-blur-[2px] lg:hidden"
            onClick={() => setIsMobileFiltersOpen(false)}
            aria-label="Fermer les filtres"
          />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]">

          {/* ── Sidebar filters ──────────────────────────────── */}
          <aside className={`${
            isMobileFiltersOpen
              ? 'filter-panel-mobile fixed inset-x-3 top-[116px] z-40 block overflow-y-auto rounded-[28px] bg-white/96 p-1 shadow-2xl backdrop-blur-2xl sm:right-auto sm:w-[400px] dark:bg-slate-950/96'
              : 'hidden'
          } lg:static lg:block lg:w-auto lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none`}>
            <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_56px_-30px_rgba(15,23,42,0.32)] lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:rounded-[26px] dark:border-slate-800 dark:bg-slate-900">

              {/* Mobile header */}
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <div>
                  <p className="section-label">Affiner la selection</p>
                  <p className="mt-1.5 text-lg font-bold text-slate-950 dark:text-white">Filtres du catalogue</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  aria-label="Masquer les filtres"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Desktop header */}
              <div className="mb-5 hidden items-center justify-between lg:flex">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <LayoutGrid className="mr-1.5 inline h-3 w-3" />
                  Filtres
                </h2>
                {activeFiltersCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[11px] font-semibold text-sky-700 transition-colors hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
                  >
                    Reinitialiser
                  </button>
                ) : null}
              </div>

              {/* Categories */}
              <div>
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Categories</h2>
                <div className="mt-3 space-y-0.5">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                    <input
                      type="radio"
                      name="category"
                      checked={!selectedCategory}
                      onChange={() => setSelectedCategory('')}
                      className="h-4 w-4 accent-sky-700"
                    />
                    Toutes les categories
                  </label>
                  {(categories || []).map((category) => (
                    <label
                      key={category.id}
                      className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === category.id}
                        onChange={() => setSelectedCategory(category.id)}
                        className="h-4 w-4 accent-sky-700"
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="mt-6">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Budget</h2>
                <div className="mt-2.5 rounded-xl bg-sky-50/80 px-3.5 py-2.5 dark:bg-sky-950/30">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatPrice(priceRange[0])} - {priceRange[1] >= maxCatalogPrice ? 'Max' : formatPrice(priceRange[1])}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Minimum
                    <input
                      type="number"
                      min={0}
                      max={priceRange[1]}
                      value={priceRange[0]}
                      onChange={(event) => setPriceRange([Math.min(Number(event.target.value), priceRange[1] - 1), priceRange[1]])}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </label>
                  <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Maximum
                    <input
                      type="number"
                      min={priceRange[0]}
                      max={maxCatalogPrice}
                      value={priceRange[1]}
                      onChange={(event) => setPriceRange([priceRange[0], Math.max(Number(event.target.value), priceRange[0] + 1)])}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </label>
                </div>
              </div>

              {/* Sort */}
              <div className="mt-6">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Tri</h2>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="mt-2.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="name">Nom (A - Z)</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix decroissant</option>
                </select>
              </div>

              {/* Mobile footer actions */}
              <div className="sticky bottom-0 -mx-5 mt-6 flex gap-2 border-t border-slate-200/80 bg-white/95 px-5 pb-1 pt-4 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
                {activeFiltersCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                  >
                    Effacer
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="flex-1 rounded-full bg-sky-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  Voir {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </aside>

          {/* ── Product grid ──────────────────────────────────── */}
          <section id="product-grid">
            {/* Result bar */}
            <div className="mobile-result-bar mb-5 flex flex-col gap-4 rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-[0_16px_64px_-40px_rgba(15,23,42,0.45)] ring-1 ring-white/60 backdrop-blur sm:mb-6 sm:rounded-[26px] sm:p-5 md:flex-row md:items-center md:justify-between dark:border-slate-800 dark:bg-slate-900/95 dark:ring-white/[0.03]">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Catalogue</p>
                <h2 className="mt-1.5 text-lg font-bold text-slate-950 sm:text-xl dark:text-white">
                  {isLoadingProducts
                    ? 'Chargement...'
                    : `${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''} disponible${filteredProducts.length > 1 ? 's' : ''}`}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? `Resultats pour "${searchQuery}"`
                    : 'Naviguez par categorie, budget ou besoin.'}
                </p>
              </div>
              <Link
                to="/contact"
                className="btn-liquid btn-lift inline-flex shrink-0 items-center justify-center rounded-full bg-sky-900 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-900/15 hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                Besoin d'aide pour choisir ?
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>

            {/* Products */}
            {isLoadingProducts ? (
              <CatalogSkeleton
                withFilters={false}
                count={10}
                title="Chargement du catalogue"
                subtitle="Les produits arrivent dans quelques instants."
              />
            ) : isProductsError ? (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <h3 className="text-xl font-semibold text-slate-950 dark:text-white">
                  Le catalogue n'a pas pu etre charge.
                </h3>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                {isMobileViewport ? (
                  <div className="mobile-app-products-grid">
                    {paginatedProducts.map((product) => (
                      <MobileProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="mobile-product-grid grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
                    {paginatedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} size="small" />
                    ))}
                  </div>
                )}
                <div className="mt-6 overflow-hidden rounded-[22px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <Pagination
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalItems={filteredProducts.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    pageSizeOptions={[12, 24, 48]}
                    itemLabel="produit"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-white px-6 py-20 text-center dark:border-slate-700 dark:bg-slate-900">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-100 dark:bg-slate-800">
                  <SlidersHorizontal className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950 dark:text-white">
                  Aucun produit ne correspond a vos criteres.
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Essayez d'ajuster vos filtres pour elargir la recherche.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-6 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  Reinitialiser les filtres
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
