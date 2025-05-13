import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { signOut } from '../../lib/auth';
import {
  LayoutDashboard,
  Package,
  ShoppingBag, 
  Tag, 
  Star, 
  Users,
  BarChart, 
  Percent, 
  Bell,
  Settings,
  LogOut, 
  Menu, 
  X,
  ShoppingCart
} from 'lucide-react';
import { QueryClient } from '@tanstack/react-query';

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  // Effet pour forcer le rechargement des données lors du changement de page
  React.useEffect(() => {
    // Invalidate queries when navigating between admin pages to ensure fresh data
    const queryClient = new QueryClient();
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    
    console.log('Admin navigation to:', location.pathname);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier';

  const menuItems = [
    { name: 'Tableau de bord', path: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, adminOnly: true },
    { name: 'Produits', path: '/admin/products', icon: <Package className="h-5 w-5" />, adminOnly: true },
    { name: 'Commandes', path: '/admin/orders', icon: <ShoppingBag className="h-5 w-5" />, adminOnly: true },
    { name: 'Catégories', path: '/admin/categories', icon: <Tag className="h-5 w-5" />, adminOnly: true },
    { name: 'Clients', path: '/admin/customers', icon: <Users className="h-5 w-5" />, adminOnly: true },
    { name: 'Caisse', path: '/admin/pos', icon: <ShoppingCart className="h-5 w-5" />, adminOnly: false },
    { name: 'Statistiques', path: '/admin/analytics', icon: <BarChart className="h-5 w-5" />, adminOnly: true },
    { name: 'Promotions', path: '/admin/promotions', icon: <Percent className="h-5 w-5" />, adminOnly: true },
    { name: 'Notifications', path: '/admin/notifications', icon: <Bell className="h-5 w-5" />, adminOnly: false },
    { name: 'Utilisateurs', path: '/admin/users', icon: <Users className="h-5 w-5" />, adminOnly: true },
    { name: 'Paramètres', path: '/admin/settings', icon: <Settings className="h-5 w-5" />, adminOnly: true },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    // Si l'utilisateur est admin, montrer tous les items
    if (isAdmin) return true;
    
    // Si l'utilisateur est caissier, montrer seulement les items non adminOnly
    if (isCashier) return !item.adminOnly;
    
    // Par défaut, ne rien montrer
    return false;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar for desktop */}
      <div 
        className={`hidden md:flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className={`text-xl font-bold text-gray-900 dark:text-white ${!isSidebarOpen && 'hidden'}`}>
            Admin Panel
          </h1>
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-1">
            {filteredMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {isSidebarOpen && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md"
          >
            <LogOut className="h-5 w-5 mr-3" />
            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          isMobileSidebarOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={toggleMobileSidebar}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Admin Panel
            </h1>
            <button 
              onClick={toggleMobileSidebar}
              className="p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-4 px-3">
            <nav className="space-y-1">
              {filteredMenuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`
                  }
                  onClick={toggleMobileSidebar}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md"
              >
              <LogOut className="h-5 w-5 mr-3" />
              <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <button
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
              onClick={toggleMobileSidebar}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              {user && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                  <strong>Connecté en tant que :</strong> {(user as any).login}
                </span>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}