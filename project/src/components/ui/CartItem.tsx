import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '../../store/cart';
import { formatPrice } from '../../lib/utils';
import type { Database } from '../../types/database';

type Product = Database['public']['Tables']['products']['Row'];

interface CartItemProps {
  product: Product;
  quantity: number;
}

export function CartItem({ product, quantity }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(product.id);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b dark:border-gray-700">
      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
        <img
          src={Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=800&auto=format&fit=crop'}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {product.name}
        </h3>
        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Prix unitaire : {formatPrice(product.sale_price || product.price)}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleQuantityChange(quantity - 1)}
          className="p-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center">{quantity}</span>
        <button
          onClick={() => handleQuantityChange(quantity + 1)}
          className="p-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="text-right min-w-[100px]">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {formatPrice((product.sale_price || product.price) * quantity)}
        </div>
      </div>

      <button
        onClick={() => removeItem(product.id)}
        className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  );
}