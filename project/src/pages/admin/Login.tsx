import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { login as loginService } from '../../services/auth';
import { useSiteFavicon } from '../../hooks/useSiteFavicon';

export function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = React.useState(false);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('favicon,logo,tab_title').single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useSiteFavicon(settings?.favicon, settings?.logo);

  if (user) {
    return <Navigate to={user.role === 'admin' || user.role === 'superadmin' ? '/admin/dashboard' : '/admin/pos'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const authenticatedUser = await loginService(formData.email, formData.password);
      setUser(authenticatedUser);
      if (authenticatedUser.role === 'admin' || authenticatedUser.role === 'superadmin') {
        toast.success('Bienvenue dans le tableau de bord administrateur.');
        navigate('/admin/dashboard');
      } else {
        toast.success('Bienvenue au point de vente.');
        navigate('/admin/pos');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* Halos d'arrière-plan */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-sky-900/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-slate-800/40 blur-[100px]" />

      {/* Grille subtile */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Marque */}
        <div className="mb-8 text-center">
          {settings?.logo ? (
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-[0_0_0_1px_rgba(14,165,233,0.25)] backdrop-blur">
              <img
                src={settings.logo}
                alt="Logo Sphère Office"
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
          ) : (
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-900/60 shadow-[0_0_0_1px_rgba(14,165,233,0.25)] backdrop-blur">
              <span className="font-display text-2xl font-bold text-white">S</span>
            </div>
          )}
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Sphère<span className="text-sky-400">.</span>Office
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Administration
          </p>
        </div>

        {/* Carte */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-md">
          <h2 className="mb-6 text-lg font-semibold text-slate-100">
            Connexion à l'espace d'administration
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className="block w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                placeholder="admin@sphere-office.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-700/60 hover:text-slate-300"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center rounded-full bg-sky-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition-all hover:bg-sky-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="mr-2.5 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connexion en cours…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            Accès réservé aux administrateurs et caissiers de Sphère Office.
          </p>
        </div>
      </div>
    </div>
  );
}
