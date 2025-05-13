import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Tag, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import type { Database } from '../../types/database';

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

export function Promotions() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPromotion, setEditingPromotion] = React.useState<Promotion | null>(null);
  const [formData, setFormData] = React.useState<PromotionFormData>(initialFormData);

  const { data: promotions, isLoading: isLoadingPromotions } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: async () => {
      // Récupérer d'abord toutes les promotions
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (promotionsError) throw promotionsError;

      // Pour chaque promotion, récupérer ses produits via la table de jonction
      const promotionsWithProducts = await Promise.all(
        promotionsData.map(async (promotion) => {
          const { data: productsData, error: productsError } = await supabase
            .from('promotion_products')
            .select('products (*)')
            .eq('promotion_id', promotion.id);

          if (productsError) throw productsError;

          return {
            ...promotion,
            products: productsData.map((item) => item.products),
          };
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
      // Créer d'abord la promotion
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .insert([{
          name: data.name,
          description: data.description,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          start_date: data.start_date,
          end_date: data.end_date || null,
        }])
        .select()
        .single();

      if (promotionError) throw promotionError;

      // Ensuite créer les associations avec les produits
      if (data.product_ids.length > 0) {
        const { error: productsError } = await supabase
          .from('promotion_products')
          .insert(
            data.product_ids.map(productId => ({
              promotion_id: promotion.id,
              product_id: productId,
            }))
          );

        if (productsError) throw productsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setIsModalOpen(false);
      setFormData(initialFormData);
    },
  });

  const updatePromotion = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PromotionFormData }) => {
      // Mettre à jour la promotion
      const { error: promotionError } = await supabase
        .from('promotions')
        .update({
          name: data.name,
          description: data.description,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          start_date: data.start_date,
          end_date: data.end_date || null,
        })
        .eq('id', id);

      if (promotionError) throw promotionError;

      // Supprimer les anciennes associations
      const { error: deleteError } = await supabase
        .from('promotion_products')
        .delete()
        .eq('promotion_id', id);

      if (deleteError) throw deleteError;

      // Créer les nouvelles associations
      if (data.product_ids.length > 0) {
        const { error: productsError } = await supabase
          .from('promotion_products')
          .insert(
            data.product_ids.map(productId => ({
              promotion_id: id,
              product_id: productId,
            }))
          );

        if (productsError) throw productsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setIsModalOpen(false);
      setEditingPromotion(null);
      setFormData(initialFormData);
    },
  });

  const deletePromotion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      end_date: promotion.end_date
        ? new Date(promotion.end_date).toISOString().split('T')[0]
        : '',
      product_ids: promotion.products.map((p) => p.id),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      deletePromotion.mutate(id);
    }
  };

  if (isLoadingPromotions) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Promotions
        </h1>
        <button
          onClick={() => {
            setEditingPromotion(null);
            setFormData(initialFormData);
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouvelle promotion
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions?.map((promotion) => (
          <div
            key={promotion.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {promotion.name}
                </h3>
                {promotion.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {promotion.description}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(promotion)}
                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDelete(promotion.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Tag className="h-5 w-5 mr-2" />
                <span>
                  {promotion.discount_type === 'percentage'
                    ? `${promotion.discount_value}% de réduction`
                    : `${formatPrice(promotion.discount_value)} de réduction`}
                </span>
              </div>

              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Calendar className="h-5 w-5 mr-2" />
                <span>
                  Du {new Date(promotion.start_date).toLocaleDateString()}
                  {promotion.end_date &&
                    ` au ${new Date(promotion.end_date).toLocaleDateString()}`}
                </span>
              </div>

              <div className="pt-4 border-t dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Produits ({promotion.products.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {promotion.products.map((product) => (
                    <span
                      key={product.id}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      {product.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {editingPromotion ? 'Modifier la promotion' : 'Nouvelle promotion'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nom
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type de réduction
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount_type: e.target.value as 'percentage' | 'fixed',
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="percentage">Pourcentage</option>
                    <option value="fixed">Montant fixe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valeur
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        discount_value: parseFloat(e.target.value),
                      }))
                    }
                    min="0"
                    step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        start_date: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        end_date: e.target.value,
                      }))
                    }
                    min={formData.start_date}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Produits
                </label>
                <select
                  multiple
                  value={formData.product_ids}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      product_ids: Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      ),
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  size={5}
                  required
                >
                  {products?.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {editingPromotion ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}