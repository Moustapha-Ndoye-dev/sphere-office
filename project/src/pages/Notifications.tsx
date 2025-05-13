import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Package, Star, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export function Notifications() {
  const { data: notifications, isLoading } = useQuery({
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

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Aucune notification
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Vous n'avez pas encore de notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Notifications
      </h1>

      <div className="space-y-4">
        {notifications.map((notification) => {
          const Icon = notificationIcons[notification.type];
          return (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors ${
                !notification.is_read
                  ? 'border-l-4 border-primary-600'
                  : ''
              }`}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <div className="flex items-start">
                <div
                  className={`p-2 rounded-lg ${
                    !notification.is_read
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <Icon className="h-6 w-6" />
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
                    <span className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Liens d'action selon le type de notification */}
                  {notification.type.startsWith('order_') && (
                    <div className="mt-2">
                      <a
                        href={`/order-confirmation/${notification.metadata.order_id}`}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Voir la commande
                      </a>
                    </div>
                  )}
                  {notification.type === 'review_approved' && (
                    <div className="mt-2">
                      <a
                        href={`/products/${notification.metadata.product_id}`}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        Voir le produit
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}