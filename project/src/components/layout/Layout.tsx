import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Header } from './Header';
import { Footer } from './Footer';
import { MobileDock } from './MobileDock';
import { useThemeStore } from '../../store/theme';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { supabase } from '../../lib/supabase';
import { useSiteFavicon } from '../../hooks/useSiteFavicon';

export function Layout() {
  const { isDarkMode } = useThemeStore();
  const location = useLocation();
  const [scrollProgress, setScrollProgress] = React.useState(0);
  useScrollReveal();

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useSiteFavicon(settings?.favicon, settings?.logo);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollProgress(isNaN(pct) ? 0 : Math.min(pct, 100));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <div className="scroll-progress-bar" style={{ width: `${scrollProgress}%` }} />
      <Header />
      <main key={location.pathname} className="flex-1 animate-page-enter main-safe-pad">
        <Outlet />
      </main>
      <Footer />
      <MobileDock />
    </div>
  );
}
