import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicProduct } from '../../services/products';
import { formatPrice } from '../../lib/utils';
import { useCartStore } from '../../store/cart';

type Product = PublicProduct;

interface MobileCartItemProps {
  product: Product;
  quantity: number;
}

export function MobileCartItem({ product, quantity }: MobileCartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();
  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? (product.images[0] as string)
      : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=400&auto=format&fit=crop';
  const unitPrice = product.sale_price || product.price;

  return (
    <article className="mobile-app-cart-item">
      <Link to={`/products/${product.slug}`} className="mobile-app-cart-media" aria-label={product.name}>
        <img src={imageUrl} alt={product.name} loading="lazy" />
      </Link>

      <div className="mobile-app-cart-body">
        <div className="mobile-app-cart-top">
          <Link to={`/products/${product.slug}`}>
            <h3>{product.name}</h3>
          </Link>
          <button
            type="button"
            onClick={() => removeItem(product.id)}
            className="mobile-app-cart-remove"
            aria-label={`Retirer ${product.name} du panier`}
          >
            <Trash2 />
          </button>
        </div>

        <p className="mobile-app-cart-unit">{formatPrice(unitPrice)} / unite</p>

        <div className="mobile-app-cart-bottom">
          <div className="mobile-app-stepper" aria-label="Quantite">
            <button
              type="button"
              onClick={() => (quantity > 1 ? updateQuantity(product.id, quantity - 1) : removeItem(product.id))}
              aria-label="Diminuer la quantite"
            >
              <Minus />
            </button>
            <span>{quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(product.id, quantity + 1)}
              aria-label="Augmenter la quantite"
            >
              <Plus />
            </button>
          </div>
          <div className="mobile-app-cart-total">
            <span>Total</span>
            <strong>{formatPrice(unitPrice * quantity)}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
