import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Tag, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import type { Database } from '../../types/database';
import toast from 'react-hot-toast';

type Product = Database['public']['Tables']['products']['Row'];

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  products: Product[];
}

interface PromotionFormData {
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  product_ids: string[];
}

const initialFormData: PromotionFormData = {
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  product_ids: [],
};

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

function isActive(promotion: Promotion) {
  const now = new Date();
  const start = new Date(promotion.start_date);
  const end = promotion.end_date ? new Date(promotion.end_date) : null;
  return now >= start && (!end || now <= end);
}

export function Promotions() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPromotion, setEditingPromotion] = React.useState<Promotion | null>(null);
  const [formData, setFormData] = React.useState<PromotionFormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const togglePromotionProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter((id) => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  const { data: promotions, isLoading: isLoadingPromotions } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (promotionsError) throw promotionsError;

      const promotionsWithProducts = await Promise.all(
        (promotionsData || []).map(async (promotion) => {
          const { data: productsData, error: productsError } = await supabase
            .from('promotion_products')
            .select('products (*)')
            .eq('promotion_id', promotion.id);
          if (productsError) throw productsError;
          return { ...promotion, products: (productsData || []).map((item) => item.products).filter(Boolean) };
        })
      );
      return promotionsWithProducts as Promotion[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
  });

  const createPromotion = useMutation({
    mutationFn: async (data: PromotionFormData) => {
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .insert([{ name: data.name, description: data.description, discount_type: data.discount_type, discount_value: data.discount_value, start_date: data.start_date, end_date: data.end_date || null }])
        .select()
        .single();
      if (promotionError) throw promotionError;
      if (data.product_ids.length > 0) {
        const { error: productsError } = await supabase
          .from('promotion_products')
          .insert(data.product_ids.map((productId) => ({ promotion_id: promotion.id, product_id: productId })));
        if (productsError) {
          await supabase.from('promotions').delete().eq('id', promotion.id);
          throw productsError;
        }
      }
      toast.success('Promotion créée avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setIsModalOpen(false);
      setFormData(initialFormData);
      setFormError(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur lors de la creation';
      setFormError(message);
      toast.error(message);
    },
  });

  const updatePromotion = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PromotionFormData }) => {
      const { error: promotionError } = await supabase
        .from('promotions')
        .update({ name: data.name, description: data.description, discount_type: data.discount_type, discount_value: data.discount_value, start_date: data.start_date, end_date: data.end_date || null })
        .eq('id', id);
      if (promotionError) throw promotionError;
      const { error: deleteError } = await supabase.from('promotion_products').delete().eq('promotion_id', id);
      if (deleteError) throw deleteError;
      if (data.product_ids.length > 0) {
        const { error: productsError } = await supabase
          .from('promotion_products')
          .insert(data.product_ids.map((productId) => ({ promotion_id: id, product_id: productId })));
        if (productsError) throw productsError;
      }
      toast.success('Promotion mise à jour');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setIsModalOpen(false);
      setEditingPromotion(null);
      setFormData(initialFormData);
      setFormError(null);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise a jour';
      setFormError(message);
      toast.error(message);
    },
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Promotion supprimée');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setDeleteConfirmId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Le nom de la promotion est obligatoire.');
      return;
    }

    if (!Number.isFinite(formData.discount_value) || formData.discount_value <= 0) {
      setFormError('La valeur de reduction doit etre superieure a 0.');
      return;
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      setFormError('Le pourcentage de reduction ne peut pas depasser 100%.');
      return;
    }

    if (formData.end_date && formData.end_date < formData.start_date) {
      setFormError('La date de fin doit etre posterieure a la date de debut.');
      return;
    }

    if (editingPromotion) {
      updatePromotion.mutate({ id: editingPromotion.id, data: formData });
    } else {
      createPromotion.mutate(formData);
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      start_date: new Date(promotion.start_date).toISOString().split('T')[0],
      end_date: promotion.end_date ? new Date(promotion.end_date).toISOString().split('T')[0] : '',
      product_ids: promotion.products.map((p) => p.id),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  if (isLoadingPromotions) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 h-48 dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Promotions</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {promotions?.length ?? 0} promotion{(promotions?.length ?? 0) > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => { setEditingPromotion(null); setFormData(initialFormData); setFormError(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-800 active:scale-95 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          Créer une promotion
        </button>
      </div>

      {(!promotions || promotions.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
          <Tag className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-4 text-sm text-slate-400">Aucune promotion pour le moment.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {promotions?.map((promotion) => {
          const active = isActive(promotion);
          return (
            <div
              key={promotion.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-shadow hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{promotion.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'}`}>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {promotion.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{promotion.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleEdit(promotion)}
                    className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(promotion.id)}
                    className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Tag className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {promotion.discount_type === 'percentage'
                      ? `${promotion.discount_value}% de réduction`
                      : `${formatPrice(promotion.discount_value)} de réduction`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Du {new Date(promotion.start_date).toLocaleDateString('fr-FR')}
                    {promotion.end_date && ` au ${new Date(promotion.end_date).toLocaleDateString('fr-FR')}`}
                  </span>
                </div>
              </div>

              {promotion.products.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Produits ({promotion.products.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {promotion.products.slice(0, 3).map((product) => (
                      <span
                        key={product.id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {product.name}
                      </span>
                    ))}
                    {promotion.products.length > 3 && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400 dark:bg-slate-800">
                        +{promotion.products.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Supprimer cette promotion ?</h3>
            <p className="mt-2 text-sm text-slate-500">Cette action est irréversible.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={() => deletePromotion.mutate(deleteConfirmId)}
                disabled={deletePromotion.isPending}
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
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setFormError(null); }} />
          <div className="relative my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingPromotion ? 'Modifier la promotion' : 'Nouvelle promotion'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setFormError(null); }}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {formError}
                </div>
              )}
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
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Type de réduction</label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                    className={inputCls}
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Valeur {formData.discount_type === 'percentage' ? '(%)' : '(FCFA)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, discount_value: Number(e.target.value) }))}
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                    className={inputCls}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Date de début</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                    className={inputCls}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Date de fin <span className="normal-case font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                    min={formData.start_date}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Produits concernés <span className="normal-case font-normal text-slate-400">({formData.product_ids.length} sélectionné{formData.product_ids.length > 1 ? 's' : ''})</span>
                </label>
                <div className="mb-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                  {(products ?? []).length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-slate-400">Aucun produit disponible.</p>
                  ) : (
                    <div className="grid gap-1">
                      {products?.map((product) => {
                        const checked = formData.product_ids.includes(product.id);
                        return (
                          <label
                            key={product.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                              checked
                                ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePromotionProduct(product.id)}
                              className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                            />
                            <span className="min-w-0 flex-1 truncate">{product.name}</span>
                            <span className="shrink-0 text-xs font-semibold text-slate-400">{formatPrice(product.sale_price || product.price)}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <select
                  multiple
                  value={formData.product_ids}
                  onChange={(e) => setFormData((prev) => ({ ...prev, product_ids: Array.from(e.target.selectedOptions, (o) => o.value) }))}
                  className="hidden"
                >
                  {products?.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>
              </div>
              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setFormError(null); }}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createPromotion.isPending || updatePromotion.isPending}
                  className="rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {createPromotion.isPending || updatePromotion.isPending
                    ? 'Enregistrement...'
                    : editingPromotion ? 'Mettre à jour' : 'Créer la promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
