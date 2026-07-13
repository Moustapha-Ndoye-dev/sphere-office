import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PublicProduct } from '../services/products';
import { getEffectiveProductPrice, isSellableProduct } from '../lib/productAvailability';

type Product = PublicProduct;

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  syncProducts: (products: Product[]) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getItemsCount: () => number;
}

function clampQuantity(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

function sanitizePersistedItems(persistedState: unknown): CartItem[] {
  if (!persistedState || typeof persistedState !== 'object') return [];
  const rawItems = (persistedState as { items?: unknown }).items;
  if (!Array.isArray(rawItems)) return [];

  const itemsByProductId = new Map<string, CartItem>();
  rawItems.forEach((rawItem) => {
    if (!rawItem || typeof rawItem !== 'object') return;
    const candidate = rawItem as { product?: unknown; quantity?: unknown };
    if (!candidate.product || typeof candidate.product !== 'object') return;
    const product = candidate.product as Record<string, unknown>;
    if (typeof product.id !== 'string' || typeof product.name !== 'string' || typeof product.slug !== 'string') return;
    if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0) return;
    if (product.sale_price !== null && product.sale_price !== undefined
      && (typeof product.sale_price !== 'number' || !Number.isFinite(product.sale_price) || product.sale_price <= 0)) return;
    if (!isSellableProduct(candidate.product as Product)) return;

    const quantity = clampQuantity(typeof candidate.quantity === 'number' ? candidate.quantity : 1);
    const existing = itemsByProductId.get(product.id);
    itemsByProductId.set(product.id, {
      product: candidate.product as Product,
      quantity: Math.min((existing?.quantity || 0) + quantity, 100),
    });
  });

  return [...itemsByProductId.values()];
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        set((state) => {
          if (!isSellableProduct(product)) return state;
          const safeQuantity = clampQuantity(quantity);
          const existingItem = state.items.find((item) => item.product.id === product.id);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: Math.min(item.quantity + safeQuantity, 100) }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { product, quantity: safeQuantity }],
          };
        });
      },

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: clampQuantity(quantity) }
              : item
          ),
        }));
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      syncProducts: (products) => {
        const productsById = new Map(products.map((product) => [product.id, product]));
        set((state) => {
          const itemsByProductId = new Map<string, CartItem>();
          state.items.forEach((item) => {
            const product = productsById.get(item.product.id);
            if (!product || !isSellableProduct(product)) return;
            const existing = itemsByProductId.get(product.id);
            itemsByProductId.set(product.id, {
              product,
              quantity: Math.min((existing?.quantity || 0) + clampQuantity(item.quantity), 100),
            });
          });
          return { items: [...itemsByProductId.values()] };
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          const price = getEffectiveProductPrice(item.product);
          return price === null ? total : total + price * item.quantity;
        }, 0);
      },

      getTotal: () => {
        return get().getSubtotal();
      },

      getItemsCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      merge: (persistedState, currentState) => ({
        ...currentState,
        items: sanitizePersistedItems(persistedState),
      }),
    }
  )
);
