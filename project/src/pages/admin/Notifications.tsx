import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Package, Star, AlertTriangle, Check, Filter, Search, Trash2, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

type NotificationType =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_status_changed'
  | 'payment_status_changed'
  | 'low_stock'
  | 'review_approved';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

const notificationIcons = {
  order_placed: Package,
  order_confirmed: Package,
  order_shipped: Package,
  order_delivered: Package,
  order_status_changed: Package,
  payment_status_changed: Package,
  low_stock: AlertTriangle,
  review_approved: Star,
};

const notificationTypes = {
  order_placed: 'Nouvelle commande',
  order_confirmed: 'Commande confirmée',
  order_shipped: 'Commande expédiée',
  order_delivered: 'Commande livrée',
  order_status_changed: 'Statut commande',
  payment_status_changed: 'Statut paiement',
  low_stock: 'Stock bas',
  review_approved: 'Avis approuvé',
};

const typeColors: Record<string, string> = {
  order_placed: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  order_confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  order_shipped: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  order_delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  order_status_changed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  payment_status_changed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  low_stock: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  review_approved: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
};

export function Notifications() {
  const queryClient = useQueryClient();
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification marquée comme lue');
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Toutes les notifications sont marquées comme lues');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification supprimée');
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').delete().eq('is_read', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifications lues supprimées');
    },
  });

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredNotifications = React.useMemo(() => {
    if (!notifications) return [];
    return notifications.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(n.type);
      const matchesRead = !showUnreadOnly || !n.is_read;
      return matchesSearch && matchesType && matchesRead;
    });
  }, [notifications, searchTerm, selectedTypes, showUnreadOnly]);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 h-20 dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? (
              <span className="text-sky-600 dark:text-sky-400 font-medium">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span>
            ) : 'Tout est à jour'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Actualiser"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-sky-400 hover:text-sky-800 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
          >
            <Check className="h-4 w-4" />
            Tout marquer comme lu
          </button>
          <button
            onClick={() => deleteAllRead.mutate()}
            className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer les lues
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Type filter */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsTypeDropdownOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-sky-400 dark:border-slate-700 dark:text-slate-300"
              >
                <Filter className="h-4 w-4 text-slate-400" />
                {selectedTypes.length === 0 ? 'Type' : `${selectedTypes.length} filtre${selectedTypes.length > 1 ? 's' : ''}`}
              </button>
              {isTypeDropdownOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  {Object.entries(notificationTypes).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(value)}
                        onChange={() =>
                          setSelectedTypes((prev) =>
                            prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      {label}
                    </label>
                  ))}
                  {selectedTypes.length > 0 && (
                    <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
                      <button
                        onClick={() => setSelectedTypes([])}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-sky-600"
                      >
                        <X className="h-3.5 w-3.5" />
                        Effacer la sélection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unread only toggle */}
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">Non lues</span>
            </label>

            {(selectedTypes.length > 0 || searchTerm || showUnreadOnly) && (
              <button
                onClick={() => { setSelectedTypes([]); setSearchTerm(''); setShowUnreadOnly(false); }}
                className="text-xs text-slate-400 hover:text-sky-600 transition-colors"
              >
                Tout effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications list */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
          <Bell className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">Aucune notification</p>
          <p className="mt-1 text-xs text-slate-400">
            {searchTerm || selectedTypes.length > 0 || showUnreadOnly
              ? 'Aucun résultat pour ces filtres.'
              : "Vous n'avez pas encore de notifications."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => {
            const Icon = notificationIcons[notification.type] ?? Bell;
            const colorCls = typeColors[notification.type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

            return (
              <div
                key={notification.id}
                className={`group relative rounded-2xl border bg-white p-4 transition-all hover:shadow-sm dark:bg-slate-900 ${
                  !notification.is_read
                    ? 'border-sky-200 dark:border-sky-900/60'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {!notification.is_read && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-sky-500" />
                )}

                <div className="flex items-start gap-3 pl-2">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colorCls}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-semibold ${notification.is_read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{notification.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-slate-400">
                          {new Date(notification.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead.mutate(notification.id)}
                            className="ml-1 rounded-xl p-1.5 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
                            title="Marquer comme lu"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification.mutate(notification.id)}
                          className="rounded-xl p-1.5 text-slate-400 transition-all hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {notification.type?.startsWith('order_') && Boolean(notification.metadata?.order_id) && (
                      <Link
                        to={`/admin/orders?orderId=${encodeURIComponent(String(notification.metadata.order_id))}`}
                        className="mt-2 inline-flex text-xs font-semibold text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 hover-underline"
                      >
                        Voir la commande →
                      </Link>
                    )}
                    {notification.type === 'low_stock' && (
                      <Link
                        to="/admin/products"
                        className="mt-2 inline-flex text-xs font-semibold text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 hover-underline"
                      >
                        Gérer les stocks →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
