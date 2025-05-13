import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductCard } from '../components/ui/ProductCard';

export function Products() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');
  const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 1000000]);
  const [sortBy, setSortBy] = React.useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories!products_category_id_fkey(*)');

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = React.useMemo(() => {
    if (!productsData) return [];

    return productsData.filter((product) => {
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      const price = product.sale_price || product.price;
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];

      return matchesCategory && matchesPrice;
    }).sort((a, b) => {
      const priceA = a.sale_price || a.price;
      const priceB = b.sale_price || b.price;

      switch (sortBy) {
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [productsData, selectedCategory, priceRange, sortBy]);

  if (isLoadingProducts || isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Mobile Filters Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsFilterOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="font-medium">Filtres</span>
          {selectedCategory && (
            <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-full">
              {categories?.find(c => c.id === selectedCategory)?.name}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
        {/* Filters Sidebar - Desktop */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 sticky top-24">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Filtres
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Catégories
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      checked={!selectedCategory}
                      onChange={() => setSelectedCategory('')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      Toutes les catégories
                    </span>
                  </label>
                  {categories?.map((category) => (
                    <label key={category.id} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        checked={selectedCategory === category.id}
                        onChange={() => setSelectedCategory(category.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        {category.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Prix (FCFA)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">FCFA</span>
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([
                            Math.min(Number(e.target.value), priceRange[1]),
                            priceRange[1],
                          ])
                        }
                        className="w-24 pl-12 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        min="0"
                        step="1000"
                      />
                    </div>
                    <span className="text-gray-500">à</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">FCFA</span>
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([
                            priceRange[0],
                            Math.max(Number(e.target.value), priceRange[0]),
                          ])
                        }
                        className="w-24 pl-12 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        min={priceRange[0]}
                        step="1000"
                      />
                    </div>
                  </div>
                  <div className="relative pt-2">
                    <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-primary-500"
                        style={{ 
                          left: `${(priceRange[0] / 1000000) * 100}%`,
                          right: `${100 - (priceRange[1] / 1000000) * 100}%`
                        }}
                      />
                      <input
                        type="range"
                        min="0"
                        max="1000000"
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([Number(e.target.value), priceRange[1]])
                        }
                        className="absolute w-full h-2 opacity-0 cursor-pointer"
                      />
                      <input
                        type="range"
                        min="0"
                        max="1000000"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([priceRange[0], Number(e.target.value)])
                        }
                        className="absolute w-full h-2 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>0 FCFA</span>
                      <span>1M FCFA</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Trier par
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                >
                  <option value="name">Nom</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {isFilterOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white dark:bg-gray-800 shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Filtres</h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Catégories
                  </h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="category-mobile"
                        checked={!selectedCategory}
                        onChange={() => {
                          setSelectedCategory('');
                          setIsFilterOpen(false);
                        }}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        Toutes les catégories
                      </span>
                    </label>
                    {categories?.map((category) => (
                      <label key={category.id} className="flex items-center">
                        <input
                          type="radio"
                          name="category-mobile"
                          checked={selectedCategory === category.id}
                          onChange={() => {
                            setSelectedCategory(category.id);
                            setIsFilterOpen(false);
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                          {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Prix (FCFA)
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">FCFA</span>
                        <input
                          type="number"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([
                              Math.min(Number(e.target.value), priceRange[1]),
                              priceRange[1],
                            ])
                          }
                          className="w-24 pl-12 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          min="0"
                          step="1000"
                        />
                      </div>
                      <span className="text-gray-500">à</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">FCFA</span>
                        <input
                          type="number"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([
                              priceRange[0],
                              Math.max(Number(e.target.value), priceRange[0]),
                            ])
                          }
                          className="w-24 pl-12 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          min={priceRange[0]}
                          step="1000"
                        />
                      </div>
                    </div>
                    <div className="relative pt-2">
                      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-primary-500"
                          style={{ 
                            left: `${(priceRange[0] / 1000000) * 100}%`,
                            right: `${100 - (priceRange[1] / 1000000) * 100}%`
                          }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="1000000"
                          value={priceRange[0]}
                          onChange={(e) =>
                            setPriceRange([Number(e.target.value), priceRange[1]])
                          }
                          className="absolute w-full h-2 opacity-0 cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0"
                          max="1000000"
                          value={priceRange[1]}
                          onChange={(e) =>
                            setPriceRange([priceRange[0], Number(e.target.value)])
                          }
                          className="absolute w-full h-2 opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-500">
                        <span>0 FCFA</span>
                        <span>1M FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Trier par
                  </h3>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as typeof sortBy);
                      setIsFilterOpen(false);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700"
                  >
                    <option value="name">Nom</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Aucun produit ne correspond à vos critères.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}