import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart';
import { createOrder } from '../services/orders';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  React.useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const order = await createOrder(
        {
          customer_name: formData.customerName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes || null,
          total: getTotal(),
          status: 'pending',
        },
        items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.sale_price || item.product.price,
        }))
      );

      clearCart();
      
      toast.success('Commande confirmée ! Redirection vers la confirmation...');
      
      setTimeout(() => {
        navigate(`/order-confirmation/${order.id}`, { replace: true });
      }, 500);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Erreur lors de la création de la commande. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
          Finaliser la commande
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Informations de livraison
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="customerName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Nom complet
                </label>
                <input
                  type="text"
                  id="customerName"
                  required
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customerName: e.target.value,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Adresse de livraison
                </label>
                <textarea
                  id="address"
                  required
                  rows={3}
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Notes (optionnel)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Récapitulatif de la commande
            </h2>

            <div className="divide-y dark:divide-gray-700">
              {items.map((item) => (
                <div key={item.product.id} className="py-4 flex justify-between">
                  <div>
                    <p className="text-gray-900 dark:text-gray-100">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Quantité : {item.quantity}
                    </p>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatPrice(
                      (item.product.sale_price || item.product.price) *
                        item.quantity
                    )}
                  </p>
                </div>
              ))}

              <div className="py-4">
                <div className="flex justify-between text-base font-medium text-gray-900 dark:text-gray-100">
                  <span>Total</span>
                  <span>{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Traitement...' : 'Confirmer la commande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}