import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, ImagePlus, Search, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { uploadProductImage, deleteProductImage } from '../../lib/storage';
import type { Database } from '../../types/database';
import { Pagination } from '../../components/ui/Pagination';
import toast from 'react-hot-toast';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type ProductStatus = Database['public']['Enums']['product_status'];
type ProductAvailability = Database['public']['Enums']['product_availability'];

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: number;
  sale_price: number | null;
  sku: string | null;
  status: ProductStatus;
  is_featured: boolean;
  availability: ProductAvailability;
  low_stock_threshold: number;
  purchase_price: number;
  weight: number | null;
  volume: number | null;
  stock: number;
  category_id: string;
  images: string[];
}

const initialFormData: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  price: 0,
  sale_price: null,
  sku: null,
  status: 'active',
  is_featured: false,
  availability: 'available',
  low_stock_threshold: 5,
  purchase_price: 0,
  weight: null,
  volume: null,
  stock: 0,
  category_id: '',
  images: [],
};

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export function Products() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [formData, setFormData] = React.useState<ProductFormData>(initialFormData);
  const [isUploading, setIsUploading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [stockFilter, setStockFilter] = React.useState<'all' | 'available' | 'low' | 'out'>('all');
  const [statusFilter, setStatusFilter] = React.useState<'all' | ProductStatus>('all');
  const [availabilityFilter, setAvailabilityFilter] = React.useState<'all' | ProductAvailability>('all');
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = React.useState(false);

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)');
      if (error) {
        toast.error('Erreur lors du chargement des produits');
        throw error;
      }
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw error;
      return data;
    },
  });

  const createProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { error } = await supabase.from('products').insert([data]);
      if (error) {
        toast.error('Erreur lors de la création du produit');
        throw error;
      }
      toast.success('Produit créé avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsModalOpen(false);
      setFormData(initialFormData);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const { error } = await supabase.from('products').update(data).eq('id', id);
      if (error) {
        toast.error('Erreur lors de la mise à jour du produit');
        throw error;
      }
      toast.success('Produit mis à jour avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData(initialFormData);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const product = products?.find((p) => p.id === id);
      if (product?.images) {
        await Promise.all(product.images.map((url: string) => deleteProductImage(url)));
      }
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        toast.error('Erreur lors de la suppression du produit');
        throw error;
      }
      toast.success('Produit supprimé avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteConfirmId(null);
    },
  });

  const bulkDeleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      const prodsToDelete = (products || []).filter((p) => ids.includes(p.id));
      await Promise.all(
        prodsToDelete.flatMap((p) =>
          Array.isArray(p.images) ? p.images.map((url: string) => deleteProductImage(url)) : []
        )
      );
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} produit${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const imageUrl = await uploadProductImage(file);
      setFormData((prev) => ({ ...prev, images: [...prev.images, imageUrl] }));
      toast.success('Image uploadee avec succes');
    } catch {
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveImage = async (urlToRemove: string) => {
    try {
      await deleteProductImage(urlToRemove);
      setFormData((prev) => ({ ...prev, images: prev.images.filter((url) => url !== urlToRemove) }));
      toast.success('Image supprimée avec succès');
    } catch {
      toast.error("Erreur lors de la suppression de l'image");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price < 0 || (formData.sale_price ?? 0) < 0 || formData.stock < 0 || formData.low_stock_threshold < 0 || formData.purchase_price < 0) {
      toast.error('Les montants et stocks ne peuvent pas être négatifs.');
      return;
    }
    if (formData.sale_price && formData.sale_price >= formData.price) {
      toast.error('Le prix promo doit être inférieur au prix normal.');
      return;
    }
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: formData });
      } else {
        await createProduct.mutateAsync(formData);
      }
    } catch {
      // handled in mutations
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: product.price,
      sale_price: product.sale_price,
      sku: product.sku,
      status: product.status,
      is_featured: product.is_featured,
      availability: product.availability,
      low_stock_threshold: product.low_stock_threshold,
      purchase_price: product.purchase_price,
      weight: product.weight,
      volume: product.volume,
      stock: product.stock,
      category_id: product.category_id,
      images: Array.isArray(product.images) ? product.images : [],
    });
    setIsModalOpen(true);
  };

  const filteredProducts = (products || []).filter((p) => {
    const q = search.toLowerCase();
    const categoryName = ((p as unknown as { category?: Category }).category?.name ?? '').toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      categoryName.includes(q);
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'available' && p.stock > 5) ||
      (stockFilter === 'low' && p.stock > 0 && p.stock <= p.low_stock_threshold) ||
      (stockFilter === 'out' && p.stock === 0);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesAvailability = availabilityFilter === 'all' || p.availability === availabilityFilter;
    return matchesSearch && matchesStock && matchesStatus && matchesAvailability;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleStockFilterChange = (value: typeof stockFilter) => {
    setStockFilter(value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleStatusFilterChange = (value: typeof statusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleAvailabilityFilterChange = (value: typeof availabilityFilter) => {
    setAvailabilityFilter(value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const pageIds = paginatedProducts.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id));
  const stockSummary = React.useMemo(() => {
    const list = products || [];
    return {
      available: list.filter((product) => product.stock > 5).length,
      low: list.filter((product) => product.stock > 0 && product.stock <= product.low_stock_threshold).length,
      out: list.filter((product) => product.stock === 0).length,
      draft: list.filter((product) => product.status === 'draft').length,
      archived: list.filter((product) => product.status === 'archived').length,
    };
  }, [products]);

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (isLoadingProducts) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-7 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-36 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Produits</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {search ? (
              <><span className="font-semibold text-sky-600 dark:text-sky-400">{filteredProducts.length}</span> résultat{filteredProducts.length > 1 ? 's' : ''} sur {products?.length ?? 0} produit{(products?.length ?? 0) > 1 ? 's' : ''}</>
            ) : (
              <>{products?.length ?? 0} produit{(products?.length ?? 0) > 1 ? 's' : ''} au catalogue</>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData(initialFormData);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-800 active:scale-95 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          Nouveau produit
        </button>
      </div>

      {/* Search + page size */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, slug ou catégorie…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:grid-cols-[minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(8rem,auto)] xl:flex xl:flex-wrap xl:items-center">
          <select
            value={stockFilter}
            onChange={(e) => handleStockFilterChange(e.target.value as typeof stockFilter)}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">Tous les stocks</option>
            <option value="available">Disponible</option>
            <option value="low">Stock faible</option>
            <option value="out">Rupture</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as typeof statusFilter)}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="draft">Brouillon</option>
            <option value="archived">Archive</option>
          </select>
          <select
            value={availabilityFilter}
            onChange={(e) => handleAvailabilityFilterChange(e.target.value as typeof availabilityFilter)}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">Toutes disponibilites</option>
            <option value="available">Disponible</option>
            <option value="unavailable">Indisponible</option>
            <option value="on_order">Sur commande</option>
          </select>
          <span className="hidden text-xs text-slate-500 whitespace-nowrap xl:inline">Lignes par page</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleStockFilterChange('available')}
          className={`rounded-2xl border p-4 text-left transition-colors ${stockFilter === 'available' ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Disponible</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stockSummary.available}</p>
        </button>
        <button
          type="button"
          onClick={() => handleStockFilterChange('low')}
          className={`rounded-2xl border p-4 text-left transition-colors ${stockFilter === 'low' ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stock faible</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{stockSummary.low}</p>
        </button>
        <button
          type="button"
          onClick={() => handleStockFilterChange('out')}
          className={`rounded-2xl border p-4 text-left transition-colors ${stockFilter === 'out' ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rupture</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{stockSummary.out}</p>
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800/50 dark:bg-sky-950/30">
          <span className="text-sm font-medium text-sky-900 dark:text-sky-300">
            {selectedIds.length} produit{selectedIds.length > 1 ? 's' : ''} sélectionné{selectedIds.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer {selectedIds.length > 1 ? `les ${selectedIds.length}` : 'le sélectionné'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="grid gap-3 md:hidden">
        {paginatedProducts.map((product) => {
          const isSelected = selectedIds.includes(product.id);
          const category = (product.category as Category)?.name ?? 'Sans categorie';
          const stockClasses = product.stock > product.low_stock_threshold
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
            : product.stock > 0
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
            : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300';

          return (
            <div key={product.id} className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${isSelected ? 'border-sky-300 dark:border-sky-800' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex gap-3">
                <button onClick={() => toggleSelect(product.id)} className="mt-1 text-slate-400">
                  {isSelected ? <CheckSquare className="h-4 w-4 text-sky-600" /> : <Square className="h-4 w-4" />}
                </button>
                <img
                  className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 object-cover dark:border-slate-800"
                  src={Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'}
                  alt=""
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name}</h3>
                  <p className="truncate text-xs text-slate-400">{product.slug}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">{category}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{product.status}</span>
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800 dark:bg-violet-950/50 dark:text-violet-300">{product.availability}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stockClasses}`}>{product.stock} en stock</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500">Prix</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatPrice(product.sale_price || product.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(product)} className="rounded-xl p-2 text-slate-500 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/50">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteConfirmId(product.id)} className="rounded-xl p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {paginatedProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            {search ? `Aucun produit ne correspond a "${search}".` : 'Aucun produit trouve.'}
          </div>
        )}
      </div>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] overflow-hidden dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="w-12 px-4 py-3.5 text-left">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title={allPageSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  >
                    {allPageSelected ? (
                      <CheckSquare className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    ) : somePageSelected ? (
                      <CheckSquare className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Produit</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Catégorie</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Prix</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Stock</th>
                <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <tr
                    key={product.id}
                    className={`group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isSelected ? 'bg-sky-50/60 dark:bg-sky-950/20' : ''}`}
                  >
                    <td className="w-12 px-4 py-4">
                      <button
                        onClick={() => toggleSelect(product.id)}
                        className="flex items-center text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          className="h-10 w-10 rounded-xl object-cover border border-slate-100 dark:border-slate-800"
                          src={
                            Array.isArray(product.images) && product.images.length > 0
                              ? product.images[0]
                              : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'
                          }
                          alt=""
                        />
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name}</div>
                          <div className="text-xs text-slate-400">{product.sku || product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                        {(product.category as Category)?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{formatPrice(product.price)}</div>
                      {product.sale_price && (
                        <div className="text-xs font-medium text-rose-500">{formatPrice(product.sale_price)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          product.stock > product.low_stock_threshold
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : product.stock > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        }`}
                      >
                        {product.stock} en stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="rounded-xl p-2 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(product.id)}
                          className="rounded-xl p-2 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                    {search ? `Aucun produit ne correspond à "${search}".` : 'Aucun produit trouvé.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="produit"
          />
        )}
      </div>

      {filteredProducts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            itemLabel="produit"
          />
        </div>
      )}

      {/* Bulk delete confirmation */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setBulkDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Supprimer {selectedIds.length} produit{selectedIds.length > 1 ? 's' : ''} ?
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cette action est irréversible. Les produits et leurs images seront définitivement supprimés.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={() => bulkDeleteProducts.mutate(selectedIds)}
                disabled={bulkDeleteProducts.isPending}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
              >
                {bulkDeleteProducts.isPending ? 'Suppression...' : 'Supprimer tout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Supprimer le produit ?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cette action est irréversible. Le produit et ses images seront définitivement supprimés.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteProduct.mutate(deleteConfirmId)}
                disabled={deleteProduct.isPending}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-3 py-6 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nom</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">SKU / Référence</label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value.trim() || null }))}
                    className={inputCls}
                    placeholder="REF-001"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Statut</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ProductStatus }))}
                    className={inputCls}
                  >
                    <option value="active">Actif</option>
                    <option value="draft">Brouillon</option>
                    <option value="archived">Archive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prix (FCFA)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    min="0"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prix promo</label>
                  <input
                    type="number"
                    value={formData.sale_price || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sale_price: e.target.value ? Number(e.target.value) : null }))}
                    min="0"
                    placeholder="Optionnel"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                    min="0"
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Seuil bas</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData((prev) => ({ ...prev, low_stock_threshold: Number(e.target.value) }))}
                    min="0"
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Disponibilité</label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData((prev) => ({ ...prev, availability: e.target.value as ProductAvailability }))}
                    className={inputCls}
                  >
                    <option value="available">Disponible</option>
                    <option value="unavailable">Indisponible</option>
                    <option value="on_order">Sur commande</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prix d'achat</label>
                  <input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchase_price: Number(e.target.value) }))}
                    min="0"
                    className={inputCls}
                  />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  Produit mis en avant
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Poids</label>
                  <input
                    type="number"
                    value={formData.weight ?? ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value ? Number(e.target.value) : null }))}
                    min="0"
                    placeholder="Optionnel"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Volume</label>
                  <input
                    type="number"
                    value={formData.volume ?? ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, volume: e.target.value ? Number(e.target.value) : null }))}
                    min="0"
                    placeholder="Optionnel"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Catégorie</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category_id: e.target.value }))}
                  className={inputCls}
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Images</label>
                {formData.images.length > 0 && (
                  <div className="mb-3 grid grid-cols-4 gap-3">
                    {formData.images.map((url, index) => (
                      <div key={index} className="group relative">
                        <img src={url} alt="" className="h-20 w-full rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(url)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 transition-colors hover:border-sky-400 hover:bg-sky-50/30 dark:border-slate-700 dark:hover:border-sky-600">
                  <ImagePlus className="mb-2 h-6 w-6 text-slate-400" />
                  <span className="text-sm font-medium text-slate-500">
                    {isUploading ? 'Upload en cours...' : 'Cliquer pour ajouter une image'}
                  </span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
              </div>

              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploading || createProduct.isPending || updateProduct.isPending}
                  className="rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {isUploading ? 'Upload...' : editingProduct ? 'Mettre à jour' : 'Créer le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
