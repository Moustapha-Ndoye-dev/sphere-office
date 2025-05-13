import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Package, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';

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
  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_stats');
      if (error) throw error;
      return data as Customer[];
    },
  });

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
        Clients
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers?.map((customer) => (
          <div
            key={customer.email}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {customer.customer_name}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Mail className="h-5 w-5 mr-2" />
                <span>{customer.email}</span>
              </div>

              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Phone className="h-5 w-5 mr-2" />
                <span>{customer.phone}</span>
              </div>

              <div className="flex items-start text-gray-600 dark:text-gray-400">
                <MapPin className="h-5 w-5 mr-2 mt-0.5" />
                <span className="flex-1">{customer.address}</span>
              </div>

              <div className="pt-4 border-t dark:border-gray-700">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Package className="h-5 w-5 mr-2" />
                    <span>Commandes</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {customer.total_orders}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total dépensé
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatPrice(customer.total_spent)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Calendar className="h-5 w-5 mr-2" />
                    <span>Dernière commande</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(customer.last_order_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}