import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { getCurrentUser } from '../../services/auth';

interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  average_order_value: number;
  revenue_growth: number;
  orders_growth: number;
  customers_growth: number;
  top_products: {
    name: string;
    total_sales: number;
    revenue: number;
  }[];
  sales_by_category: {
    name: string;
    total_sales: number;
    revenue: number;
  }[];
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_stats');
      if (error) throw error;
      return data as DashboardStats;
    },
  });

  const user = getCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Chiffre d\'affaires',
      value: formatPrice(stats.total_revenue),
      icon: TrendingUp,
      trend: stats.revenue_growth,
      description: `Total des ventes sur la période`,
    },
    {
      title: 'Commandes',
      value: stats.total_orders,
      icon: ShoppingCart,
      trend: stats.orders_growth,
      description: `Nombre total de commandes`,
    },
    {
      title: 'Clients',
      value: stats.total_customers,
      icon: Users,
      trend: stats.customers_growth,
      description: `Nombre total de clients uniques`,
    },
    {
      title: 'Panier moyen',
      value: formatPrice(stats.average_order_value),
      icon: Package,
      trend: 0,
      description: `Valeur moyenne des commandes`,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Tableau de bord
      </h1>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-2 rounded-lg ${
                  stat.trend >= 0
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                }`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              {typeof stat.trend === 'number' && (
                <div className="flex items-center">
                  {stat.trend >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`ml-1 text-sm ${
                      stat.trend >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {Math.abs(stat.trend)}%
                  </span>
                </div>
              )}
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              {stat.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meilleures ventes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Meilleures ventes
          </h2>
          <div className="space-y-4">
            {stats.top_products.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {product.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {product.total_sales} ventes
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatPrice(product.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ventes par catégorie */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Ventes par catégorie
          </h2>
          <div className="space-y-4">
            {stats.sales_by_category.map((category, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {category.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {category.total_sales} ventes
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatPrice(category.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}