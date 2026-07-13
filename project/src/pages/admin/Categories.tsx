import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';
import { Pagination } from '../../components/ui/Pagination';
import toast from 'react-hot-toast';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string | null;
}

const initialFormData: CategoryFormData = { name: '', slug: '', parent_id: null };

const inputCls = 'block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function Categories() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
  const [formData, setFormData] = React.useState<CategoryFormData>(initialFormData);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createCategory = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const { error } = await supabase.from('categories').insert([data]);
      if (error) throw error;
      toast.success('Catégorie créée avec succès');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsModalOpen(false);
      setFormData(initialFormData);
    },
    onError: () => toast.error('Erreur lors de la création'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const { error } = await supabase.from('categories').update(data).eq('id', id);
      if (error) throw error;
      toast.success('Catégorie mise à jour');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormData(initialFormData);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('Catégorie supprimée');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setDeleteConfirmId(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory.id, data: formData });
    } else {
      createCategory.mutate(formData);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, slug: category.slug, parent_id: category.parent_id });
    setIsModalOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const filteredCategories = (categories ?? []).filter((c) => {
    const q = search.toLowerCase();
    const parentName = (categories ?? []).find((p) => p.id === c.parent_id)?.name ?? '';
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || parentName.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredCategories.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Catégories</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {search ? (
              <><span className="font-semibold text-sky-600 dark:text-sky-400">{filteredCategories.length}</span> résultat{filteredCategories.length > 1 ? 's' : ''} sur {categories?.length ?? 0} catégorie{(categories?.length ?? 0) > 1 ? 's' : ''}</>
            ) : (
              <>{categories?.length ?? 0} catégorie{(categories?.length ?? 0) > 1 ? 's' : ''} au total</>
            )}
          </p>
        </div>
        <button
          onClick={() => { setEditingCategory(null); setFormData(initialFormData); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-800 active:scale-95 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          <Plus className="h-4 w-4" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, slug ou catégorie parente…"
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

      <div className="space-y-3 md:hidden">
        {paginated.length > 0 ? (
          paginated.map((category) => (
            <article key={category.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{category.name}</h2>
                  <p className="mt-1 truncate font-mono text-xs text-slate-500 dark:text-slate-400">{category.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="rounded-xl p-2 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(category.id)}
                    className="rounded-xl p-2 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3">
                {category.parent_id ? (
                  <span className="inline-flex max-w-full rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Parent: {(categories ?? []).find((c) => c.id === category.parent_id)?.name ?? '-'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Categorie racine</span>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            {search ? `Aucune categorie ne correspond a "${search}".` : 'Aucune categorie pour le moment.'}
          </div>
        )}
      </div>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] overflow-hidden dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Nom</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Slug</th>
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Parente</th>
                <th className="px-6 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginated.map((category) => (
                <tr key={category.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{category.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{category.slug}</span>
                  </td>
                  <td className="px-6 py-4">
                    {category.parent_id ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {(categories ?? []).find((c) => c.id === category.parent_id)?.name ?? '—'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(category.id)}
                        className="rounded-xl p-2 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                    {search ? `Aucune catégorie ne correspond à "${search}".` : 'Aucune catégorie pour le moment.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredCategories.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredCategories.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            itemLabel="catégorie"
          />
        )}
      </div>

      {filteredCategories.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredCategories.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            itemLabel="categorie"
          />
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Supprimer la catégorie ?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Les produits associés perdront leur catégorie. Cette action est irréversible.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 dark:border-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteCategory.mutate(deleteConfirmId)}
                disabled={deleteCategory.isPending}
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
          <div className="relative my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
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
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Catégorie parente <span className="normal-case font-normal text-slate-400">(optionnel)</span>
                </label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, parent_id: e.target.value || null }))}
                  className={inputCls}
                >
                  <option value="">Aucune</option>
                  {(categories ?? [])
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
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
                  disabled={createCategory.isPending || updateCategory.isPending}
                  className="rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {editingCategory ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
