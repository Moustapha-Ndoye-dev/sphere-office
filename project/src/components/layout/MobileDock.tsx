import { Heart, Home, ShoppingBag, ShoppingCart } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useCartStore } from '../../store/cart';
import { useFavoritesStore } from '../../store/favorites';

const ITEMS = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/products', label: 'Boutique', icon: ShoppingBag },
  { to: '/favorites', label: 'Favoris', icon: Heart },
  { to: '/cart', label: 'Panier', icon: ShoppingCart },
];

export function MobileDock() {
  const cartItems = useCartStore((state) => state.items);
  const favoriteItems = useFavoritesStore((state) => state.items);

  return (
    <nav
      aria-label="Navigation mobile rapide"
      className="mobile-dock dock-safe-bottom fixed inset-x-3 z-50 md:hidden"
    >
      <div className="mobile-dock-inner mx-auto flex max-w-md items-center justify-around rounded-[28px] border border-white/75 bg-white/92 px-2 py-2 shadow-[0_20px_60px_-16px_rgba(15,23,42,0.45),0_2px_8px_-2px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-900/94">
        {ITEMS.map((item) => {
          const count = item.to === '/cart' ? cartItems.length : item.to === '/favorites' ? favoriteItems.length : 0;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mobile-dock-link relative flex min-w-[4.25rem] flex-col items-center gap-1 rounded-[22px] px-2 py-2.5 text-[10px] font-semibold tracking-wide transition-all duration-250 ${
                  isActive
                    ? 'bg-sky-950 text-white shadow-md shadow-sky-950/25 dark:bg-sky-500 dark:text-slate-950'
                    : 'text-slate-500 hover:text-slate-700 active:scale-95 active:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:active:bg-slate-800'
                }`
              }
            >
              <span className="relative">
                <item.icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
                {count > 0 ? (
                  <span className="absolute -right-3 -top-2 flex min-h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900 animate-scale-in">
                    {count}
                  </span>
                ) : null}
              </span>
              <span className="mobile-dock-label leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
