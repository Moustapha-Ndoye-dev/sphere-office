import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import React from 'react';
import { Toaster } from 'react-hot-toast';

const Home = React.lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const Products = React.lazy(() => import('./pages/Products').then((module) => ({ default: module.Products })));
const Category = React.lazy(() => import('./pages/Category').then((module) => ({ default: module.Category })));
const ProductDetail = React.lazy(() => import('./pages/ProductDetail').then((module) => ({ default: module.ProductDetail })));
const ProductRequest = React.lazy(() => import('./pages/ProductRequest').then((module) => ({ default: module.ProductRequest })));
const Cart = React.lazy(() => import('./pages/Cart').then((module) => ({ default: module.Cart })));
const Checkout = React.lazy(() => import('./pages/Checkout').then((module) => ({ default: module.Checkout })));
const OrderConfirmation = React.lazy(() => import('./pages/OrderConfirmation').then((module) => ({ default: module.OrderConfirmation })));
const OrderTracking = React.lazy(() => import('./pages/OrderTracking').then((module) => ({ default: module.OrderTracking })));
const Favorites = React.lazy(() => import('./pages/Favorites').then((module) => ({ default: module.Favorites })));
const About = React.lazy(() => import('./pages/About').then((module) => ({ default: module.About })));
const Contact = React.lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })));
const NotFound = React.lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));
const Login = React.lazy(() => import('./pages/admin/Login').then((module) => ({ default: module.Login })));
const Dashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = React.lazy(() => import('./pages/admin/Products').then((module) => ({ default: module.Products })));
const Orders = React.lazy(() => import('./pages/admin/Orders').then((module) => ({ default: module.Orders })));
const ProductRequests = React.lazy(() => import('./pages/admin/ProductRequests').then((module) => ({ default: module.ProductRequests })));
const Categories = React.lazy(() => import('./pages/admin/Categories').then((module) => ({ default: module.Categories })));
const Customers = React.lazy(() => import('./pages/admin/Customers').then((module) => ({ default: module.Customers })));
const Analytics = React.lazy(() => import('./pages/admin/Analytics').then((module) => ({ default: module.Analytics })));
const Promotions = React.lazy(() => import('./pages/admin/Promotions').then((module) => ({ default: module.Promotions })));
const AdminNotifications = React.lazy(() => import('./pages/admin/Notifications').then((module) => ({ default: module.Notifications })));
const Pos = React.lazy(() => import('./pages/admin/Pos').then((module) => ({ default: module.Pos })));
const Settings = React.lazy(() => import('./pages/admin/Settings').then((module) => ({ default: module.Settings })));
const Users = React.lazy(() => import('./pages/admin/Users').then((module) => ({ default: module.Users })));
const Account = React.lazy(() => import('./pages/admin/Account').then((module) => ({ default: module.Account })));

function RouteFallback() {
  return (
    <div className="min-h-[calc(100dvh-10rem)] bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-[1800px] animate-pulse rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900">
        <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-5 h-9 max-w-xl rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-3 max-w-2xl rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-3 max-w-md rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

function AppContent() {
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);

  React.useEffect(() => {
    document.title = 'Sphere Office';
  }, []);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <Router>
      <React.Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products">
            <Route index element={<Products />} />
            <Route path=":slug/request" element={<ProductRequest />} />
            <Route path=":slug" element={<ProductDetail />} />
          </Route>
          <Route path="categories/:slug" element={<Category />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="order-tracking" element={<OrderTracking />} />
          <Route path="order-tracking/:orderId" element={<OrderTracking />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>

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
          <Route path="product-requests" element={<ProtectedRoute><ProductRequests /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute requireAdmin><Categories /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute requireAdmin><Customers /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
          <Route path="stats" element={<Navigate to="/admin/analytics" replace />} />
          <Route path="promotions" element={<ProtectedRoute requireAdmin><Promotions /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
          <Route path="pos" element={<ProtectedRoute><Pos /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requireAdmin><Settings /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute requireSuperAdmin><Users /></ProtectedRoute>} />
          <Route path="account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </React.Suspense>

      <Toaster
        position={isMobile ? 'bottom-center' : 'top-center'}
        containerStyle={isMobile ? { bottom: 168, pointerEvents: 'none' } : {}}
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
