import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';

type RecentOrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered';

const recentStatusConfig: Record<RecentOrderStatus, { label: string; classes: string }> = {
  pending:   { label: 'En attente', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  confirmed: { label: 'Confirmée',  classes: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300' },
  shipped:   { label: 'Expédiée',   classes: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300' },
  delivered: { label: 'Livrée',     classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
};

function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-5">
        <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-5 w-14 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800 mb-2" />
      <div className="h-7 w-32 rounded bg-slate-200 dark:bg-slate-800 mb-2" />
      <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_stats');
      if (error) throw error;
      return data;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['recent-orders-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Array<{
        id: string;
        customer_name: string;
        total: number;
        status: RecentOrderStatus;
        created_at: string;
      }>;
    },
  });

  const { data: operations } = useQuery({
    queryKey: ['dashboard-operations'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [ordersResult, productsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, status, total, created_at')
          .gte('created_at', today.toISOString())
          .limit(500),
        supabase
          .from('products')
          .select('id, stock, low_stock_threshold')
          .limit(500),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      if (productsResult.error) throw productsResult.error;
      const orders = ordersResult.data || [];
      const products = productsResult.data || [];
      return {
        todayOrders: orders.length,
        todayRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
        pendingOrders: orders.filter((order) => order.status === 'pending').length,
        lowStock: products.filter((product) => product.stock > 0 && product.stock <= (product.low_stock_threshold || 5)).length,
        outOfStock: products.filter((product) => product.stock === 0).length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Chiffre d'affaires",
      value: formatPrice(stats.total_revenue),
      icon: TrendingUp,
      trend: stats.revenue_growth,
      description: 'Total des ventes sur la période',
      color: 'sky',
    },
    {
      title: 'Commandes',
      value: String(stats.total_orders),
      icon: ShoppingCart,
      trend: stats.orders_growth,
      description: 'Nombre total de commandes',
      color: 'violet',
    },
    {
      title: 'Clients',
      value: String(stats.total_customers),
      icon: Users,
      trend: stats.customers_growth,
      description: 'Clients uniques enregistrés',
      color: 'emerald',
    },
    {
      title: 'Panier moyen',
      value: formatPrice(stats.average_order_value),
      icon: Package,
      trend: 0,
      description: 'Valeur moyenne des commandes',
      color: 'amber',
    },
  ];

  const iconBg: Record<string, string> = {
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  };

  const maxCategoryRevenue = Math.max(...(stats.sales_by_category.map((c) => c.revenue)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Vue d'ensemble de votre activité</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] transition-shadow hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg[stat.color]}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              {typeof stat.trend === 'number' && stat.trend !== 0 && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    stat.trend >= 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                  }`}
                >
                  {stat.trend >= 0 ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {Math.abs(stat.trend)}%
                </span>
              )}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {stat.title}
            </p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {stat.value}
            </p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Commandes du jour',
            value: String(operations?.todayOrders ?? 0),
            sub: operations ? formatPrice(operations.todayRevenue) : 'CA du jour',
            icon: Clock,
            classes: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
          },
          {
            label: 'En attente aujourd hui',
            value: String(operations?.pendingOrders ?? 0),
            sub: 'A confirmer',
            icon: ShoppingCart,
            classes: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
          },
          {
            label: 'Stock faible',
            value: String(operations?.lowStock ?? 0),
            sub: 'Produits a surveiller',
            icon: AlertTriangle,
            classes: 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200',
          },
          {
            label: 'Rupture',
            value: String(operations?.outOfStock ?? 0),
            sub: 'A reapprovisionner',
            icon: Package,
            classes: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200',
          },
        ].map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${item.classes}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{item.label}</p>
                <p className="mt-1 text-2xl font-black">{item.value}</p>
                <p className="mt-1 text-xs opacity-75">{item.sub}</p>
              </div>
              <item.icon className="h-6 w-6 opacity-70" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Meilleures ventes
          </h2>
          <div className="space-y-1">
            {stats.top_products.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {product.name}
                    </div>
                    <div className="text-xs text-slate-400">{product.total_sales} vente{product.total_sales > 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatPrice(product.revenue)}
                </div>
              </div>
            ))}
            {stats.top_products.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">Aucune donnée disponible.</p>
            )}
          </div>
        </div>

        {/* Sales by category with progress bars */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Ventes par catégorie
          </h2>
          {stats.sales_by_category.length > 0 ? (
            <div className="space-y-4">
              {stats.sales_by_category.map((category, index) => {
                const pct = Math.round((category.revenue / maxCategoryRevenue) * 100);
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{category.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{category.total_sales} vente{category.total_sales > 1 ? 's' : ''}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPrice(category.revenue)}</span>
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

      {/* Recent orders */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.15)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Commandes récentes
          </h2>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition-colors hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Voir tout
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="space-y-1">
          {(recentOrders ?? []).map((order) => {
            const cfg = recentStatusConfig[order.status] ?? recentStatusConfig.pending;
            return (
              <Link
                key={order.id}
                to={`/admin/orders?orderId=${order.id}`}
                className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-slate-400 shrink-0">#{order.id.slice(0, 8)}</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.classes}`}>
                    {cfg.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </Link>
            );
          })}
          {(recentOrders ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">Aucune commande pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
