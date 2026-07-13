import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicProduct } from '../services/products';

type Product = PublicProduct;

interface FavoritesStore {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInFavorites: (productId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        set((state) => ({
          items: [...state.items, product],
        }));
      },
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },
      isInFavorites: (productId) => {
        return get().items.some((item) => item.id === productId);
      },
    }),
    {
      name: 'favorites-storage',
    }
  )
);
