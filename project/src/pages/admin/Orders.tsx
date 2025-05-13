import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, Check, X, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { updateOrderStatus } from '../../services/orders';
import type { Database } from '../../types/database';
import { useReactToPrint } from 'react-to-print';
import { Invoice } from '../../components/ui/Invoice';
import toast from 'react-hot-toast';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];

interface OrderWithItems extends Order {
  items: Array<{
    product: Database['public']['Tables']['products']['Row'];
    quantity: number;
    price: number;
  }>;
}

const statusIcons = {
  pending: Receipt,
  confirmed: Check,
  shipped: Receipt,
  delivered: Check,
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
};

// Traduction des statuts pour l'affichage
const statusLabels: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
};

// Mapping inverse pour convertir les labels en statuts
const statusValues: Record<string, OrderStatus> = {
  'En attente': 'pending',
  'Confirmée': 'confirmed',
  'Expédiée': 'shipped',
  'Livrée': 'delivered',
};

export function Orders() {
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = React.useState<OrderWithItems | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const invoiceRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(*)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as OrderWithItems[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => {
      // Optimistic update
      queryClient.setQueryData(['admin-orders'], (old: OrderWithItems[] | undefined) => {
        if (!old) return old;
        return old.map(order => 
          order.id === orderId 
            ? { ...order, status } 
            : order
        );
      });

      // Actual update
      await updateOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Statut de la commande mis à jour', {
        duration: 2000,
        position: 'top-right',
      });
    },
    onError: (error) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.error('Erreur lors de la mise à jour du statut', {
        duration: 3000,
        position: 'top-right',
      });
      console.error('Error updating order status:', error);
    },
  });

  const handleStatusChange = (orderId: string, label: string) => {
    const status = statusValues[label];
    if (status) {
      updateStatus.mutate({ orderId, status });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Commandes
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Commande
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {orders?.map((order) => {
                const StatusIcon = statusIcons[order.status];
                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{order.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {order.customer_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatPrice(order.total)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={statusLabels[order.status]}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          statusColors[order.status]
                        } cursor-pointer transition-colors duration-200`}
                        disabled={updateStatus.isLoading}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsModalOpen(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setTimeout(() => {
                              handlePrint();
                            }, 100);
                          }}
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          <Receipt className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de détails de la commande */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Détails de la commande #{selectedOrder.id.slice(0, 8)}...
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Client
                  </h3>
                  <dl className="space-y-1">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      Nom
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedOrder.customer_name}
                    </dd>
                    <dt className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Email
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedOrder.email}
                    </dd>
                    <dt className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Téléphone
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedOrder.phone}
                    </dd>
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Livraison
                  </h3>
                  <dl>
                    <dt className="text-sm text-gray-500 dark:text-gray-400">
                      Adresse
                    </dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-line">
                      {selectedOrder.address}
                    </dd>
                    {selectedOrder.notes && (
                      <>
                        <dt className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Notes
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-gray-100">
                          {selectedOrder.notes}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Articles
                </h3>
                <div className="border rounded-lg dark:border-gray-700 divide-y dark:divide-gray-700">
                  {selectedOrder.items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          src={
                            Array.isArray(item.product.images) &&
                            item.product.images.length > 0
                              ? item.product.images[0]
                              : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'
                          }
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {item.product.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Quantité : {item.quantity}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center text-lg font-medium text-gray-900 dark:text-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composant Invoice caché pour l'impression */}
      <div style={{ display: 'none' }}>
        {selectedOrder && <Invoice ref={invoiceRef} order={selectedOrder} />}
      </div>
    </div>
  );
}