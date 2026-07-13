import { Minus, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cart';
import { formatPrice } from '../../lib/utils';
import type { PublicProduct } from '../../services/products';

type Product = PublicProduct;

interface CartItemProps {
  product: Product;
  quantity: number;
}

export function CartItem({ product, quantity }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? (product.images[0] as string)
      : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=400&auto=format&fit=crop';
  const unitPrice = product.sale_price || product.price;

  return (
    <div className="mobile-cart-item group py-4 last:pb-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100 dark:[&:not(:last-child)]:border-slate-800">
      <div className="mobile-cart-item-row flex gap-3 sm:gap-4">
        {/* Image */}
        <Link
          to={`/products/${product.slug}`}
          className="mobile-cart-item-image h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50 transition-opacity hover:opacity-80 sm:h-20 sm:w-20 dark:border-slate-800 dark:bg-slate-800"
        >
          <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-contain p-1.5" />
        </Link>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Name + remove */}
          <div className="flex items-start justify-between gap-2">
            <Link to={`/products/${product.slug}`} className="group/name min-w-0">
              <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 transition-colors group-hover/name:text-sky-800 sm:text-sm dark:text-slate-100 dark:group-hover/name:text-sky-300">
                {product.name}
              </h3>
            </Link>
            <button
              onClick={() => removeItem(product.id)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-300 transition-all hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              aria-label={`Retirer ${product.name} du panier`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Prix unitaire */}
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            {formatPrice(unitPrice)} / unite
          </p>

          {/* Quantite + sous-total */}
          <div className="mobile-cart-item-controls mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={() => (quantity > 1 ? updateQuantity(product.id, quantity - 1) : removeItem(product.id))}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-white hover:text-sky-700 hover:shadow-sm active:scale-90 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-300"
                aria-label="Diminuer la quantite"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(product.id, quantity + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-white hover:text-sky-700 hover:shadow-sm active:scale-90 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-300"
                aria-label="Augmenter la quantite"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatPrice(unitPrice * quantity)}
              </p>
              {quantity > 1 && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {quantity} x {formatPrice(unitPrice)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
