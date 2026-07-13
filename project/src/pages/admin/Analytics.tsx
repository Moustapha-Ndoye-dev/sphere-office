import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bell, Package, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import type { Database } from '../../types/database';

type Order = Database['public']['Tables']['orders']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type Notification = Database['public']['Tables']['notifications']['Row'];

export function Analytics() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const [ordersResult, productsResult, notificationsResult] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('products').select('id,name,slug,stock,low_stock_threshold,price,sale_price,created_at,updated_at,category_id,images').limit(500),
        supabase.from('notifications').select('id,is_read,type,title,content,recipient_email,metadata,created_at').order('created_at', { ascending: false }).limit(500),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;
      if (notificationsResult.error) throw notificationsResult.error;
      return {
        orders: (ordersResult.data || []) as Order[],
        products: (productsResult.data || []) as Product[],
        notifications: (notificationsResult.data || []) as Notification[],
      };
    },
  });

  const analytics = React.useMemo(() => {
    const orders = data?.orders || [];
    const products = data?.products || [];
    const notifications = data?.notifications || [];
    const deliveredOrders = orders.filter((o) => o.status === 'delivered');
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    const lowStockProducts = products.filter((p) => p.stock <= p.low_stock_threshold);
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalCustomers = new Set(orders.map((o) => o.email)).size;

    const salesByMonth = orders.reduce<Record<string, { orders: number; revenue: number }>>(
      (acc, order) => {
        const bucket = new Date(order.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        if (!acc[bucket]) acc[bucket] = { orders: 0, revenue: 0 };
        acc[bucket].orders += 1;
        acc[bucket].revenue += order.total;
        return acc;
      },
      {}
    );

    const salesByMonthArr = Object.entries(salesByMonth).slice(-6);
    const maxRevenue = Math.max(...salesByMonthArr.map(([, s]) => s.revenue), 1);

    return {
      totalRevenue,
      totalOrders: orders.length,
      totalCustomers,
      pendingOrders: pendingOrders.length,
      lowStockProducts,
      unreadNotifications: unreadNotifications.length,
      salesByMonth: salesByMonthArr,
      maxRevenue,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 h-32 dark:border-slate-800 dark:bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        <h1 className="text-lg font-semibold">Impossible de charger les statistiques</h1>
        <p className="mt-2 text-sm">
          {error instanceof Error ? error.message : 'Vérifiez les droits admin et la connexion Supabase.'}
        </p>
      </div>
    );
  }

  const kpis = [
    { label: 'Commandes', value: String(analytics.totalOrders), icon: ShoppingCart, color: 'sky', sub: 'Toutes périodes' },
    { label: 'Revenus', value: formatPrice(analytics.totalRevenue), icon: TrendingUp, color: 'emerald', sub: 'Commandes livrees' },
    { label: 'Clients', value: String(analytics.totalCustomers), icon: Users, color: 'violet', sub: 'Emails uniques' },
    { label: 'Alertes', value: String(analytics.unreadNotifications), icon: Bell, color: 'amber', sub: 'Notifications non lues' },
  ];

  const iconBg: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Statistiques</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Vue d'ensemble des performances, limitée aux 500 derniers enregistrements pour garder la page réactive.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg[kpi.color]}`}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">{kpi.value}</p>
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Operational overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Suivi opérationnel
          </h2>
          <div className="space-y-1">
            {[
              { label: 'Commandes en attente', value: analytics.pendingOrders, warn: analytics.pendingOrders > 5 },
              { label: 'Produits en stock bas', value: analytics.lowStockProducts.length, warn: analytics.lowStockProducts.length > 0 },
              { label: 'Notifications non lues', value: analytics.unreadNotifications, warn: analytics.unreadNotifications > 0 },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">{row.label}</span>
                <span
                  className={`text-sm font-semibold ${
                    row.warn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by month with mini bars */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Ventes par mois
          </h2>
          {analytics.salesByMonth.length > 0 ? (
            <div className="space-y-3">
              {analytics.salesByMonth.map(([month, stats]) => {
                const pct = Math.round((stats.revenue / analytics.maxRevenue) * 100);
                return (
                  <div key={month}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">{month}</span>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{formatPrice(stats.revenue)}</span>
                        <span className="ml-2 text-xs text-slate-400">{stats.orders} cmd</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-sky-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-slate-400">Aucune donnée disponible.</p>
          )}
        </div>
      </div>

      {/* Low stock products */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          Produits à surveiller
          {analytics.lowStockProducts.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 font-normal normal-case">
              {analytics.lowStockProducts.length} produit{analytics.lowStockProducts.length > 1 ? 's' : ''}
            </span>
          )}
        </h2>
        {analytics.lowStockProducts.length > 0 ? (
          <div className="space-y-1">
            {analytics.lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.slug}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    product.stock === 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}
                >
                  {product.stock} en stock
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-4 dark:bg-emerald-950/20">
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Tous les produits ont un stock suffisant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
