import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { Category } from './pages/Category';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { Favorites } from './pages/Favorites';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Login } from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import { Products as AdminProducts } from './pages/admin/Products';
import { Orders } from './pages/admin/Orders';
import { Categories } from './pages/admin/Categories';
import { Customers } from './pages/admin/Customers';
import { Analytics } from './pages/admin/Analytics';
import { Promotions } from './pages/admin/Promotions';
import { Notifications as AdminNotifications } from './pages/admin/Notifications';
import { Notifications } from './pages/Notifications';
import { Pos } from './pages/admin/Pos';
import { Settings } from './pages/admin/Settings';
import { Users } from './pages/admin/Users';
import React from 'react';
import { Toaster } from 'react-hot-toast';

// Création du client de requête avec des options de retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  // Définir le titre statique pour éviter les problèmes de chargement
  React.useEffect(() => {
    document.title = "Sphere Office";
  }, []);

  return (
    <Router>
      <Routes>
        {/* Client routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products">
            <Route index element={<Products />} />
            <Route path=":slug" element={<ProductDetail />} />
          </Route>
          <Route path="categories/:slug" element={<Category />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
          <Route path="products" element={<ProtectedRoute requireAdmin><AdminProducts /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute requireAdmin><Orders /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute requireAdmin><Categories /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute requireAdmin><Customers /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
          <Route path="promotions" element={<ProtectedRoute requireAdmin><Promotions /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
          <Route path="pos" element={<ProtectedRoute><Pos /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requireAdmin><Settings /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute requireAdmin><Users /></ProtectedRoute>} />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Toaster global pour les notifications */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 5000,
            iconTheme: {
              primary: '#4CAF50',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#E53935',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  );
}

function App() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Simuler un chargement initial pour éviter les problèmes de rendu
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary-700 via-blue-200 to-white dark:from-gray-900 dark:via-primary-900 dark:to-gray-800">
        <LoadingSpinner variant="logo" size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-md">
          <p className="font-bold">Erreur de chargement</p>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;