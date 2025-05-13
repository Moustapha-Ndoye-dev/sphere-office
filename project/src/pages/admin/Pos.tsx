import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Receipt,
  Search,
  X,
  Check,
  SlidersHorizontal
} from 'lucide-react';
import { useCartStore } from '../../store/cart';
import { getProducts, getCategories } from '../../services/products';
import { createOrder } from '../../services/orders';
import { formatPrice, calculateCartTotal } from '../../lib/utils';
import { Invoice } from '../../components/ui/Invoice';
import { LoadingSpinner } from '../../components/LoadingSpinner';

export function Pos() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');
  const [priceRange, setPriceRange] = React.useState<[number, number]>([0, 1000000]);
  const [showFilters, setShowFilters] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<'name' | 'price-asc' | 'price-desc'>('name');
  const [customerDetails, setCustomerDetails] = React.useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'card'>('cash');
  const [showInvoiceForm, setShowInvoiceForm] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [currentOrder, setCurrentOrder] = React.useState<any>(null);
  const invoiceRef = React.useRef<HTMLDivElement>(null);
  
  const { items, addItem, removeItem, updateQuantity, clearCart } = useCartStore();
  const cartTotal = calculateCartTotal(items);

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
  });

  React.useEffect(() => {
    if (currentOrder && invoiceRef.current) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentOrder, handlePrint]);

  const filteredAndSortedProducts = React.useMemo(() => {
    if (!productsData?.data) return [];
    
    let filtered = productsData.data.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      const price = product.sale_price || product.price;
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      
      return matchesSearch && matchesCategory && matchesPrice;
    });

    return filtered.sort((a, b) => {
      const priceA = a.sale_price || a.price;
      const priceB = b.sale_price || b.price;

      switch (sortBy) {
        case 'price-asc':
          return priceA - priceB;
        case 'price-desc':
          return priceB - priceA;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [productsData?.data, searchTerm, selectedCategory, priceRange, sortBy]);

  const handleConfirmCheckout = () => {
    if (items.length === 0) {
      alert('Le panier est vide');
      return;
    }
    setShowConfirmation(true);
  };

  const handleCheckout = async () => {
    setIsConfirming(true);
    try {
      const order = await createOrder(
        {
          customer_name: customerDetails.name || 'Client au comptoir',
          email: customerDetails.email || 'comptoir@sphere-office.com',
          phone: customerDetails.phone || '0000000000',
          address: customerDetails.address || 'Vente au comptoir',
          total: cartTotal,
          status: 'delivered',
        },
        items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.sale_price || item.product.price,
        }))
      );

      setCurrentOrder({
        ...order,
        items: items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.product.sale_price || item.product.price,
        })),
      });

      clearCart();
      setCustomerDetails({
        name: '',
        email: '',
        phone: '',
        address: '',
      });
      setShowInvoiceForm(false);
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Une erreur est survenue lors de la vente');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoadingProducts || isLoadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner variant="simple" size="sm" text="Chargement du point de vente..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Liste des produits */}
        <div>
          <div className="mb-4 space-y-4">
            {/* Barre de recherche et bouton filtres */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <SlidersHorizontal className="h-5 w-5" />
                Filtres
              </button>
            </div>

            {/* Panneau de filtres */}
            {showFilters && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Catégorie
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trier par
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="name">Nom</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fourchette de prix
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      min="0"
                    />
                    <span>à</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                      min={priceRange[0]}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {filteredAndSortedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => addItem(product)}
              >
                <img
                  src={Array.isArray(product.images) && product.images.length > 0
                    ? product.images[0]
                    : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'}
                  alt={product.name}
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {product.name}
                </h3>
                <p className="text-primary-600 dark:text-primary-400 font-bold">
                  {formatPrice(product.sale_price || product.price)}
                </p>
                {product.stock <= 5 && (
                  <p className="text-sm text-red-500 mt-1">
                    Stock bas: {product.stock} unités
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panier et paiement */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Panier
            </h2>

            {items.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                Le panier est vide
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between py-2 border-b dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatPrice(item.product.sale_price || item.product.price)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t dark:border-gray-700">
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100">
                    <span>Total</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mode de paiement
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`flex items-center justify-center px-4 py-2 border rounded-lg ${
                          paymentMethod === 'cash'
                            ? 'border-primary-600 bg-primary-50 text-primary-600'
                            : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        <Banknote className="h-5 w-5 mr-2" />
                        Espèces
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`flex items-center justify-center px-4 py-2 border rounded-lg ${
                          paymentMethod === 'card'
                            ? 'border-primary-600 bg-primary-50 text-primary-600'
                            : 'border-gray-300 text-gray-700'
                        }`}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Carte
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={showInvoiceForm}
                        onChange={(e) => setShowInvoiceForm(e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Générer une facture
                      </span>
                    </label>
                  </div>

                  {showInvoiceForm && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Nom du client
                        </label>
                        <input
                          type="text"
                          value={customerDetails.name}
                          onChange={(e) =>
                            setCustomerDetails((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email
                        </label>
                        <input
                          type="email"
                          value={customerDetails.email}
                          onChange={(e) =>
                            setCustomerDetails((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={customerDetails.phone}
                          onChange={(e) =>
                            setCustomerDetails((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Adresse
                        </label>
                        <textarea
                          value={customerDetails.address}
                          onChange={(e) =>
                            setCustomerDetails((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleConfirmCheckout}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Receipt className="h-5 w-5" />
                    Finaliser la vente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Confirmer la vente
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Total</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Mode de paiement</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {paymentMethod === 'cash' ? 'Espèces' : 'Carte bancaire'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                  disabled={isConfirming}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isConfirming}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700"
                >
                  {isConfirming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composant de facture caché pour l'impression */}
      <div style={{ display: 'none' }}>
        {currentOrder && <Invoice ref={invoiceRef} order={currentOrder} />}
      </div>
    </div>
  );
}