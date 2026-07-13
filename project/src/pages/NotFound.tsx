import { ArrowRight, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="empty-state-premium flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-16">
      <div className="max-w-xl text-center">
        <div className="empty-state-icon mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Search className="h-10 w-10 text-sky-700 dark:text-sky-300" />
        </div>
        <p className="section-label mt-8 justify-center">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Cette page est introuvable.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
          Le lien a peut-etre change. Retournez a la boutique ou a l'accueil pour continuer votre parcours.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/products"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-sky-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            Voir la boutique
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-6 text-sm font-semibold text-slate-900 transition-colors hover:border-sky-400 hover:text-sky-800 dark:border-slate-700 dark:text-white dark:hover:border-sky-400 dark:hover:text-sky-300"
          >
            Retour accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
