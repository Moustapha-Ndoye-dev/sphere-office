import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Package, Calendar, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { Pagination } from '../../components/ui/Pagination';

interface Customer {
  email: string;
  customer_name: string;
  phone: string;
  address: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

export function Customers() {
  const [search, setSearch] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_stats');
      if (error) throw error;
      return data as Customer[];
    },
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const filteredCustomers = (customers ?? []).filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.customer_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone ?? '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredCustomers.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 h-52 dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Clients</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {search ? (
            <><span className="font-semibold text-sky-600 dark:text-sky-400">{filteredCustomers.length}</span> résultat{filteredCustomers.length > 1 ? 's' : ''} sur {customers?.length ?? 0} client{(customers?.length ?? 0) > 1 ? 's' : ''}</>
          ) : (
            <>{customers?.length ?? 0} client{(customers?.length ?? 0) > 1 ? 's' : ''} enregistré{(customers?.length ?? 0) > 1 ? 's' : ''}</>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, e-mail ou téléphone…"
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

      {paginated.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
          <Package className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-4 text-sm text-slate-400">
            {search ? `Aucun client ne correspond à "${search}".` : 'Aucun client pour le moment.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginated.map((customer) => (
          <div
            key={customer.email}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-shadow hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
                {customer.customer_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{customer.customer_name}</h3>
                <p className="text-xs text-slate-400">{customer.email}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{customer.phone || '—'}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
                <span className="line-clamp-2">{customer.address || '—'}</span>
              </div>
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Package className="h-3.5 w-3.5" />
                  <span>Commandes</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{customer.total_orders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total dépensé</span>
                <span className="text-sm font-semibold text-sky-900 dark:text-sky-300">{formatPrice(customer.total_spent)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Dernière commande</span>
                </div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {new Date(customer.last_order_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length > pageSize && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredCustomers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            itemLabel="client"
            pageSizeOptions={[12, 24, 48]}
          />
        </div>
      )}
    </div>
  );
}
