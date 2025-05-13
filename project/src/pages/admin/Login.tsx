import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import toast from 'react-hot-toast';
import { login as loginService } from '../../services/auth';

export function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
  });
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Si l'utilisateur est déjà connecté, le rediriger
  if (user) {
    console.log('Utilisateur déjà connecté avec le rôle:', user.role);
    // Rediriger en fonction du rôle
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/admin/pos" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Utiliser le service login local
      const user = await loginService(formData.email, formData.password);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      // Rediriger selon le rôle
      if (user.role === 'admin') {
        toast.success('Connexion réussie. Bienvenue dans le tableau de bord administrateur !');
        navigate('/admin/dashboard');
      } else {
        toast.success('Connexion réussie. Bienvenue au point de vente !');
        navigate('/admin/pos');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur de connexion. Veuillez vérifier vos identifiants.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-blue-200 to-white dark:from-gray-900 dark:via-primary-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Décor en fond */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-400 opacity-20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-300 opacity-10 rounded-full blur-2xl -z-10"></div>
      <div className="max-w-md w-full space-y-8 bg-white/80 dark:bg-gray-800/80 p-10 rounded-2xl shadow-2xl backdrop-blur-lg border border-gray-100 dark:border-gray-700 relative">
        <div className="flex flex-col items-center">
          {/* Logo ou icône */}
          <div className="mb-4">
            <svg width="48" height="48" fill="none" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#2563eb"/><path d="M24 14v20M14 24h20" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Connexion à l'administration
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Entrez vos identifiants pour accéder au tableau de bord
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="on">
          <div className="space-y-6">
            <div className="relative">
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="peer block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                placeholder=" "
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              />
              <label htmlFor="email-address" className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 text-sm pointer-events-none transition-all duration-200 bg-white/80 dark:bg-gray-700 px-1
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm
                peer-focus:-top-5 peer-focus:text-xs peer-focus:text-primary-600 dark:peer-focus:text-primary-400">
                Adresse email
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="peer block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                placeholder=" "
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              />
              <label htmlFor="password" className="absolute left-4 top-3 text-gray-500 dark:text-gray-400 text-sm pointer-events-none transition-all duration-200 bg-white/80 dark:bg-gray-700 px-1
                peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm
                peer-focus:-top-5 peer-focus:text-xs peer-focus:text-primary-600 dark:peer-focus:text-primary-400">
                Mot de passe
              </label>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 shadow-lg transition-all"
            >
              {isLoading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                </span>
              ) : null}
              Se connecter
            </button>
          </div>
        </form>
        <div className="text-center text-xs text-gray-400 mt-4">
          Accès réservé aux administrateurs et caissiers Sphere Office.
        </div>
      </div>
    </div>
  );
}