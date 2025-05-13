import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Package, Star, AlertTriangle, Check, Filter, Search, Trash2, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'order_placed' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'low_stock' | 'review_approved';
  title: string;
  content: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

const notificationIcons = {
  order_placed: Package,
  order_confirmed: Package,
  order_shipped: Package,
  order_delivered: Package,
  low_stock: AlertTriangle,
  review_approved: Star,
};

const notificationTypes = {
  order_placed: 'Nouvelle commande',
  order_confirmed: 'Commande confirmée',
  order_shipped: 'Commande expédiée',
  order_delivered: 'Commande livrée',
  low_stock: 'Stock bas',
  review_approved: 'Avis approuvé',
};

export function Notifications() {
  const queryClient = useQueryClient();
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = React.useState(false);

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
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification marquée comme lue');
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Toutes les notifications ont été marquées comme lues');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification supprimée');
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('is_read', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notifications lues supprimées');
    },
  });

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSearchTerm('');
    setShowUnreadOnly(false);
  };

  const filteredNotifications = React.useMemo(() => {
    if (!notifications) return [];

    return notifications.filter(notification => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(notification.type);
      const matchesReadStatus = !showUnreadOnly || !notification.is_read;

      return matchesSearch && matchesType && matchesReadStatus;
    });
  }, [notifications, searchTerm, selectedTypes, showUnreadOnly]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.type-filter-dropdown')) {
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Notifications
        </h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
            title="Actualiser"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => markAllAsRead.mutate()}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </button>
          <button
            onClick={() => deleteAllRead.mutate()}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer les notifications lues
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans les notifications..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative type-filter-dropdown">
              <button
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:border-primary-500 dark:border-gray-600 dark:hover:border-primary-500"
              >
                <Filter className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700 dark:text-gray-300">
                  {selectedTypes.length === 0 
                    ? 'Tous les types' 
                    : `${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''} sélectionné${selectedTypes.length > 1 ? 's' : ''}`}
                </span>
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute z-10 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-2">
                    {Object.entries(notificationTypes).map(([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(value)}
                          onChange={() => toggleType(value)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4 mr-3"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>
                  
                  {selectedTypes.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                      <button
                        onClick={() => setSelectedTypes([])}
                        className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Effacer la sélection
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Non lues uniquement
              </span>
            </label>

            {(selectedTypes.length > 0 || searchTerm || showUnreadOnly) && (
              <button
                onClick={clearFilters}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
              >
                <X className="h-4 w-4 mr-1" />
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Aucune notification
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {searchTerm || selectedTypes.length > 0 || showUnreadOnly
              ? 'Aucune notification ne correspond à vos critères de recherche.'
              : 'Vous n\'avez pas encore de notifications.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const IconComponent = notification.type && notificationIcons[notification.type] ? notificationIcons[notification.type] : Bell;
            
            return (
              <div
                key={notification.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors ${
                  !notification.is_read
                    ? 'border-l-4 border-primary-600'
                    : ''
                }`}
              >
                <div className="flex items-start">
                  <div
                    className={`p-2 rounded-lg ${
                      !notification.is_read
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3
                          className={`text-sm font-medium ${
                            !notification.is_read
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {notification.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </span>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead.mutate(notification.id)}
                            className="p-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                            title="Marquer comme lu"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification.mutate(notification.id)}
                          className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {notification.type && notification.type.startsWith('order_') && notification.metadata && notification.metadata.order_id && (
                      <div className="mt-2">
                        <a
                          href={`/admin/orders/${notification.metadata.order_id}`}
                          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          Voir la commande
                        </a>
                      </div>
                    )}
                    {notification.type === 'low_stock' && (
                      <div className="mt-2">
                        <a
                          href={`/admin/products`}
                          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          Gérer les stocks
                        </a>
                      </div>
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