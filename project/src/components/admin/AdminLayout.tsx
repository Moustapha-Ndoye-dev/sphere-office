import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { signOut } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useSiteFavicon } from '../../hooks/useSiteFavicon';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Users,
  BarChart,
  Percent,
  Bell,
  Settings,
  LogOut,
  Menu,
  ShoppingCart,
  ChevronLeft,
  User,
  ClipboardList,
} from 'lucide-react';

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() => window.innerWidth >= 1280);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('favicon,logo').single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useSiteFavicon(settings?.favicon, settings?.logo);

  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-orders-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  const { data: pendingProductRequestsCount = 0 } = useQuery({
    queryKey: ['pending-product-requests-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('product_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isCashier = user?.role === 'cashier';
  const roleLabel = user?.role === 'superadmin'
    ? 'Super administrateur'
    : user?.role === 'admin'
      ? 'Administrateur'
      : 'Caissier';

  const menuItems = [
    { name: 'Tableau de bord', path: '/admin/dashboard', icon: LayoutDashboard, adminOnly: true },
    { name: 'Produits', path: '/admin/products', icon: Package, adminOnly: true },
    { name: 'Commandes', path: '/admin/orders', icon: ShoppingBag, adminOnly: true },
    { name: 'Demandes produits', path: '/admin/product-requests', icon: ClipboardList, adminOnly: false },
    { name: 'Catégories', path: '/admin/categories', icon: Tag, adminOnly: true },
    { name: 'Clients', path: '/admin/customers', icon: Users, adminOnly: true },
    { name: 'Caisse', path: '/admin/pos', icon: ShoppingCart, adminOnly: false },
    { name: 'Statistiques', path: '/admin/analytics', icon: BarChart, adminOnly: true },
    { name: 'Promotions', path: '/admin/promotions', icon: Percent, adminOnly: true },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell, adminOnly: false },
    { name: 'Utilisateurs', path: '/admin/users', icon: Users, adminOnly: true, superAdminOnly: true },
    { name: 'Paramètres', path: '/admin/settings', icon: Settings, adminOnly: true },
    { name: 'Mon compte', path: '/admin/account', icon: User, adminOnly: false },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if ('superAdminOnly' in item && item.superAdminOnly) return isSuperAdmin;
    if (isAdmin) return true;
    if (isCashier) return !item.adminOnly;
    return false;
  });

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'AD';

  const SidebarContent = ({ collapsed }: { collapsed?: boolean }) => (
    <>
      {/* Logo */}
      <div className={`flex h-16 items-center border-b border-slate-800/60 ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
        {!collapsed && (
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-white">
              Sphère<span className="text-sky-400">.</span>
            </span>
            <span className="ml-2 rounded-full bg-sky-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
              admin
            </span>
          </div>
        )}
        {collapsed && (
          <span className="font-display text-xl font-bold text-white">
            S<span className="text-sky-400">.</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `relative group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sky-950/60 text-sky-300 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.2)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.name : undefined}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`}
                />
                {!collapsed && <span>{item.name}</span>}
                {item.path === '/admin/orders' && pendingCount > 0 && (
                  collapsed ? (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-slate-950" />
                  ) : (
                    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )
                )}
                {item.path === '/admin/product-requests' && pendingProductRequestsCount > 0 && (
                  collapsed ? (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 border border-slate-950" />
                  ) : (
                    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
                      {pendingProductRequestsCount > 99 ? '99+' : pendingProductRequestsCount}
                    </span>
                  )
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Sign out */}
      <div className="border-t border-slate-800/60 p-3 space-y-1">
        {!collapsed && user && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-900 text-xs font-bold text-sky-200">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-300">{user.email}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {roleLabel}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-950/40 hover:text-red-400 ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-shell flex h-screen bg-slate-100 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-950 border-r border-slate-800/60 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-60' : 'w-16'
        }`}
      >
        <SidebarContent collapsed={!isSidebarOpen} />
      </aside>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-950 border-r border-slate-800/60 animate-slide-in-left">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop sidebar toggle */}
            <button
              className="hidden md:flex rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              onClick={() => setIsSidebarOpen((v) => !v)}
            >
              <ChevronLeft
                className={`h-5 w-5 transition-transform duration-300 ${!isSidebarOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Current page label from location */}
            <span className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 sm:block">
              {filteredMenuItems.find((item) => location.pathname.startsWith(item.path))?.name ?? 'Admin'}
            </span>
          </div>

          {/* User pill */}
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.email}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  {roleLabel}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-900 text-xs font-bold text-sky-200">
                {userInitials}
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
