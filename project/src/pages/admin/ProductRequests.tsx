import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, MapPin, PackageSearch, Phone, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

type ProductRequestStatus = Database['public']['Enums']['product_request_status'];

const STATUS_CONFIG: Record<ProductRequestStatus, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  contacted: { label: 'Client contacte', classes: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300' },
  quoted: { label: 'Devis transmis', classes: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300' },
  confirmed: { label: 'Confirmee', classes: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300' },
  cancelled: { label: 'Annulee', classes: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' },
  completed: { label: 'Terminee', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
};

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG) as Array<[
  ProductRequestStatus,
  (typeof STATUS_CONFIG)[ProductRequestStatus],
]>;

export function ProductRequests() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<ProductRequestStatus | ''>('');

  const { data: requests = [], isLoading, isError } = useQuery({
    queryKey: ['admin-product-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProductRequestStatus }) => {
      const { data, error } = await supabase
        .from('product_requests')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-product-requests-count'] });
      toast.success('Statut de la demande mis a jour.');
    },
    onError: () => toast.error('Impossible de mettre a jour la demande.'),
  });

  const filteredRequests = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = !statusFilter || request.status === statusFilter;
      const matchesSearch = !query || [
        request.product_name,
        request.product_reference || '',
        request.customer_name,
        request.phone,
        request.address,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  const pendingCount = requests.filter((request) => request.status === 'pending').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Catalogue sur commande</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Demandes produits</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Ces demandes restent separees des commandes, factures, paiements et statistiques de chiffre d'affaires.
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-5 py-3 text-center dark:bg-amber-950/30">
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{pendingCount}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">en attente</p>
        </div>
      </header>

      <div className="grid gap-3 rounded-[24px] border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px] dark:border-slate-800 dark:bg-slate-900">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Produit, client, telephone, zone..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ProductRequestStatus | '')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-[24px] bg-slate-200 dark:bg-slate-800" />
      ) : isError ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          Impossible de charger les demandes sur commande.
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <ClipboardList className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 font-semibold text-slate-900 dark:text-white">Aucune demande correspondante.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((request) => (
            <article key={request.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">Disponible sur commande</span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_CONFIG[request.status].classes}`}>{STATUS_CONFIG[request.status].label}</span>
                  </div>
                  <h2 className="mt-3 truncate text-xl font-bold text-slate-950 dark:text-white">{request.product_name}</h2>
                  <p className="mt-1 text-xs text-slate-400">{request.product_reference || 'Sans reference'} · demande {request.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 px-4 py-2 text-center dark:bg-sky-950/40">
                  <p className="text-2xl font-bold text-sky-900 dark:text-sky-200">{request.quantity}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">quantite</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="font-semibold text-slate-900 dark:text-white">{request.customer_name}</p>
                  <p className="mt-2 flex items-center text-slate-500 dark:text-slate-400"><Phone className="mr-2 h-3.5 w-3.5" />{request.phone}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="flex items-start leading-6 text-slate-600 dark:text-slate-300"><MapPin className="mr-2 mt-1 h-3.5 w-3.5 shrink-0" />{request.address}</p>
                </div>
              </div>

              {request.notes ? (
                <div className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Commentaire</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{request.notes}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <p className="flex items-center text-xs text-slate-400">
                  <PackageSearch className="mr-2 h-3.5 w-3.5" />
                  {new Intl.DateTimeFormat('fr-SN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.created_at))}
                </p>
                <select
                  value={request.status}
                  disabled={updateStatus.isPending}
                  onChange={(event) => updateStatus.mutate({ id: request.id, status: event.target.value as ProductRequestStatus })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-sky-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  aria-label={`Statut de la demande ${request.id}`}
                >
                  {STATUS_OPTIONS.map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
