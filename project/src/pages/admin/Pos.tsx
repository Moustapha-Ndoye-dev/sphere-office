import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Minus,
  Trash2,
  Receipt,
  Search,
  Check,
  SlidersHorizontal,
  PencilLine,
  FileDown,
  ChevronDown,
  ShoppingBag,
  PackagePlus,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getCategories } from '../../services/products';
import { createPosOrder } from '../../services/orders';
import { downloadInvoicePdf } from '../../services/invoices';
import { formatPrice } from '../../lib/utils';
import { calculatePosPayment, type PosPaymentMethod } from '../../lib/pos';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database';

type Product = Database['public']['Tables']['products']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];

type PosItem = {
  key: string;
  product: Product | null;
  name: string;
  reference: string | null;
  quantity: number;
  unitPrice: number;
};

type PosInvoiceOrder = Pick<Order, 'id' | 'customer_name' | 'email' | 'phone' | 'total' | 'amount_paid' | 'balance_due' | 'payment_status' | 'created_at' | 'notes'>;

const paymentStatusLabels: Record<Order['payment_status'], string> = {
  unpaid: 'Non payée',
  partial: 'Partielle',
  paid: 'Payée',
  refunded: 'Remboursée',
};

const paymentStatusClasses: Record<Order['payment_status'], string> = {
  unpaid: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  partial: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  refunded: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const paymentMethods: Array<{
  value: PosPaymentMethod;
  label: string;
}> = [
  { value: 'cash', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'card', label: 'Carte' },
  { value: 'bank_transfer', label: 'Virement' },
];

function getPaymentMethodLabel(method: PosPaymentMethod) {
  return paymentMethods.find((option) => option.value === method)?.label || method;
}

export function Pos() {
  const queryClient = useQueryClient();
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
  const [paymentMethod, setPaymentMethod] = React.useState<PosPaymentMethod>('cash');
  const [showInvoiceForm, setShowInvoiceForm] = React.useState(false);
  const [showManualItem, setShowManualItem] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const checkoutLockRef = React.useRef(false);
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [showRecentInvoices, setShowRecentInvoices] = React.useState(false);
  const [posItems, setPosItems] = React.useState<PosItem[]>([]);
  const [manualItem, setManualItem] = React.useState({ name: '', reference: '', quantity: 1, unitPrice: 0 });
  const [amountPaidInput, setAmountPaidInput] = React.useState('');
  const [invoiceSearch, setInvoiceSearch] = React.useState('');
  const cartPanelRef = React.useRef<HTMLDivElement>(null);

  const cartTotal = posItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const payment = calculatePosPayment(cartTotal, amountPaidInput, paymentMethod);
  const amountPaidValue = payment.requestedAmount;
  const normalizedAmountPaid = payment.amountPaid;
  const balanceDue = payment.balanceDue;
  const changeDue = payment.changeDue;
  const paymentStatus = payment.paymentStatus;

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .eq('availability', 'available')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;
      return { data: (data || []) as Product[] };
    },
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data: posInvoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['pos-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, customer_name, email, phone, total, amount_paid, balance_due, payment_status, created_at, notes')
        .ilike('notes', 'Vente POS%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PosInvoiceOrder[];
    },
  });

  const filteredAndSortedProducts = React.useMemo(() => {
    if (!productsData?.data) {
      return [];
    }

    const filtered = productsData.data.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const filteredInvoices = React.useMemo(() => {
    if (!posInvoices) return [];
    const query = invoiceSearch.trim().toLowerCase();
    if (!query) return posInvoices;

    return posInvoices.filter((invoice) =>
      invoice.id.toLowerCase().includes(query) ||
      invoice.customer_name.toLowerCase().includes(query) ||
      invoice.email.toLowerCase().includes(query) ||
      invoice.phone.toLowerCase().includes(query)
    );
  }, [invoiceSearch, posInvoices]);

  const handleConfirmCheckout = () => {
    if (posItems.length === 0) {
      toast.error('Le panier est vide');
      return;
    }
    if (!payment.isValid) {
      toast.error('Le montant payé doit être positif.');
      return;
    }
    if (posItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.unitPrice <= 0)) {
      toast.error('Chaque ligne doit avoir une quantité entière et un prix supérieur à zéro.');
      return;
    }
    if (paymentMethod !== 'cash' && amountPaidValue > cartTotal) {
      toast.error('Le montant payé ne peut pas dépasser le total pour ce mode de paiement.');
      return;
    }
    if (showInvoiceForm && (
      !customerDetails.name.trim() ||
      !customerDetails.email.trim() ||
      !customerDetails.phone.trim() ||
      !customerDetails.address.trim()
    )) {
      toast.error('Complétez les informations client pour générer la facture.');
      return;
    }
    setShowConfirmation(true);
  };

  const handleCheckout = async () => {
    if (checkoutLockRef.current) return;
    checkoutLockRef.current = true;
    setIsConfirming(true);
    try {
      const order = await createPosOrder(
        {
          customer_name: customerDetails.name || 'Client au comptoir',
          email: customerDetails.email || 'comptoir@sphere-office.com',
          phone: customerDetails.phone || '0000000000',
          address: customerDetails.address || 'Vente au comptoir',
          notes: `Vente POS - paiement ${getPaymentMethodLabel(paymentMethod)}`,
          total: cartTotal,
          status: 'delivered',
          payment_method: paymentMethod,
          amount_paid: normalizedAmountPaid,
          payment_note: `Paiement ${getPaymentMethodLabel(paymentMethod)}`,
        },
        posItems.map((item) => ({
          product_id: item.product?.id || null,
          item_name: item.name,
          item_reference: item.reference || item.product?.sku || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        }))
      );

      if (showInvoiceForm) {
        try {
          await downloadInvoicePdf(order.id);
          toast.success('Facture PDF téléchargée');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Erreur lors du telechargement du PDF');
        }
      }

      setPosItems([]);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-orders'] });
      setCustomerDetails({
        name: '',
        email: '',
        phone: '',
        address: '',
      });
      setShowInvoiceForm(false);
      setAmountPaidInput('');
      setShowConfirmation(false);
    } catch (error) {
      console.error('Error during checkout:', error);
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue lors de la vente');
    } finally {
      checkoutLockRef.current = false;
      setIsConfirming(false);
    }
  };

  const addCatalogProduct = (product: Product) => {
    setPosItems((current) => {
      const existing = current.find((item) => item.product?.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Stock maximum atteint pour ${product.name}.`);
          return current;
        }
        return current.map((item) => item.key === existing.key ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [
        ...current,
        {
          key: `product-${product.id}`,
          product,
          name: product.name,
          reference: product.sku || null,
          quantity: 1,
          unitPrice: product.sale_price || product.price,
        },
      ];
    });
  };

  const addManualItem = () => {
    const name = manualItem.name.trim();
    if (!name || !Number.isInteger(manualItem.quantity) || manualItem.quantity <= 0 || manualItem.unitPrice <= 0) {
      toast.error('Renseignez la désignation, la quantité et un prix valide.');
      return;
    }
    setPosItems((current) => [
      ...current,
      {
        key: `manual-${crypto.randomUUID()}`,
        product: null,
        name,
        reference: manualItem.reference.trim() || null,
        quantity: manualItem.quantity,
        unitPrice: manualItem.unitPrice,
      },
    ]);
    setManualItem({ name: '', reference: '', quantity: 1, unitPrice: 0 });
    setShowManualItem(false);
  };

  const updatePosItem = (key: string, patch: Partial<Pick<PosItem, 'quantity' | 'unitPrice'>>) => {
    setPosItems((current) => current.map((item) => item.key === key ? {
      ...item,
      ...patch,
      quantity: patch.quantity !== undefined
        ? Math.min(item.product?.stock || 100, Math.max(1, Math.floor(patch.quantity)))
        : item.quantity,
      unitPrice: patch.unitPrice !== undefined ? Math.max(0, patch.unitPrice) : item.unitPrice,
    } : item));
  };

  const removePosItem = (key: string) => {
    setPosItems((current) => current.filter((item) => item.key !== key));
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      await downloadInvoicePdf(orderId);
      toast.success('Facture PDF téléchargée');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du telechargement du PDF');
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
    <div className="mx-auto w-full max-w-[1800px] overflow-x-clip px-3 py-4 pb-24 sm:px-5 lg:px-6 xl:pb-6">
      <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-sky-950 to-sky-800 p-5 text-white shadow-[0_24px_70px_-36px_rgba(2,132,199,0.8)] sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Point de vente
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Nouvelle vente</h1>
            <p className="mt-1 text-sm text-sky-100/70">Sélectionnez les articles, encaissez, puis générez la facture si nécessaire.</p>
          </div>
          <div className="flex items-stretch gap-2">
            {posItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Vider le panier et commencer une nouvelle vente ?')) {
                    setPosItems([]);
                    setAmountPaidInput('');
                  }
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RotateCcw className="h-4 w-4" />
                Recommencer
              </button>
            )}
            <div className="min-w-40 rounded-2xl bg-white px-5 py-3 text-right text-slate-950 shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Total à encaisser</p>
              <p className="mt-0.5 text-2xl font-black tabular-nums text-sky-900">{formatPrice(cartTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="order-1 min-w-0">
          <div className="mb-4 space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row dark:border-slate-800 dark:bg-slate-900">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nom, référence ou description..."
                  className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${showFilters ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                Filtres
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${!selectedCategory ? 'bg-sky-900 text-white dark:bg-sky-600' : 'border border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
              >
                Tous
              </button>
              {categories?.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === category.id ? 'bg-sky-900 text-white dark:bg-sky-600' : 'border border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégorie</label>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">Toutes les categories</option>
                    {categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trier par</label>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="name">Nom</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix decroissant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fourchette de prix</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(event) => setPriceRange([Math.max(0, Number(event.target.value)), priceRange[1]])}
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      min="0"
                    />
                    <span className="shrink-0 text-sm text-slate-500">a</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(event) => setPriceRange([priceRange[0], Math.max(priceRange[0], Number(event.target.value))])}
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      min={priceRange[0]}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => setShowManualItem((value) => !value)}
                className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                  <PencilLine className="h-5 w-5 text-sky-700 dark:text-sky-300" />
                  Article hors catalogue
                </span>
                <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">{showManualItem ? 'Fermer' : 'Ajouter'}</span>
              </button>
              {showManualItem && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_140px_84px_126px_auto]">
                <input
                  type="text"
                  value={manualItem.name}
                  onChange={(event) => setManualItem((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Désignation du produit"
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={manualItem.reference}
                  onChange={(event) => setManualItem((current) => ({ ...current, reference: event.target.value }))}
                  aria-label="Référence optionnelle du produit hors catalogue"
                  placeholder="Référence"
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min="1"
                  value={manualItem.quantity}
                  onChange={(event) => setManualItem((current) => ({ ...current, quantity: Number(event.target.value) }))}
                  aria-label="Quantité du produit hors catalogue"
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min="1"
                  value={manualItem.unitPrice}
                  onChange={(event) => setManualItem((current) => ({ ...current, unitPrice: Number(event.target.value) }))}
                  aria-label="Prix unitaire du produit hors catalogue"
                  placeholder="Prix unitaire"
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <button onClick={addManualItem} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500">
                  <PackagePlus className="h-4 w-4" />
                  Ajouter
                </button>
              </div>
              )}
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {filteredAndSortedProducts.length} produit{filteredAndSortedProducts.length > 1 ? 's' : ''}
            </p>
            <p className="hidden text-xs text-slate-400 sm:block">Cliquez sur un produit pour l'ajouter</p>
          </div>

          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
            {filteredAndSortedProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 min-[360px]:col-span-2 md:col-span-3 2xl:col-span-4 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                Aucun produit ne correspond aux filtres.
              </div>
            ) : filteredAndSortedProducts.map((product) => (
              <button
                type="button"
                key={product.id}
                className="group relative min-h-[230px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-sky-800"
                onClick={() => addCatalogProduct(product)}
              >
                <img
                  src={
                    Array.isArray(product.images) && product.images.length > 0
                      ? product.images[0]
                      : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'
                  }
                  alt={product.name}
                  className="mb-4 h-32 w-full rounded-xl bg-slate-50 object-contain transition-transform group-hover:scale-[1.03] sm:h-36 dark:bg-slate-800"
                />
                <span className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-sky-900 text-white opacity-0 shadow-md transition group-hover:opacity-100 group-focus:opacity-100 dark:bg-sky-600">
                  <Plus className="h-4 w-4" />
                </span>
                <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name}</h3>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <p className="font-black tabular-nums text-sky-800 dark:text-sky-300">{formatPrice(product.sale_price || product.price)}</p>
                  <p className={`text-xs font-semibold ${product.stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>Stock {product.stock}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div ref={cartPanelRef} className="order-2 min-w-0 scroll-mt-24">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"><ShoppingBag className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Panier</h2>
                  <p className="text-xs text-slate-400">Vente en cours</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {posItems.length} ligne{posItems.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total</p>
                <p className="text-sm font-black tabular-nums text-slate-950 dark:text-white">{formatPrice(cartTotal)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Payé</p>
                <p className="text-sm font-black tabular-nums text-emerald-700 dark:text-emerald-300">{formatPrice(normalizedAmountPaid)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Reste</p>
                <p className={`text-sm font-black tabular-nums ${balanceDue > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-950 dark:text-white'}`}>{formatPrice(balanceDue)}</p>
              </div>
            </div>
            </div>

            {posItems.length === 0 ? (
              <div className="m-4 rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center sm:m-5 dark:border-slate-700">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800"><ShoppingBag className="h-6 w-6" /></span>
                <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">Le panier est vide</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Cliquez sur un produit du catalogue pour commencer.</p>
              </div>
            ) : (
              <div>
                <div className="space-y-2 border-b border-slate-100 p-4 sm:p-5 dark:border-slate-800">
                {posItems.map((item) => (
                  <div key={item.key} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto] dark:border-slate-800 dark:bg-slate-800/30">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-slate-900 dark:text-slate-100">{item.name}</h3>
                      {item.reference && (
                        <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Réf: {item.reference}</p>
                      )}
                      <label className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                        Prix unitaire
                        <input
                          type="number"
                          min="1"
                          value={item.unitPrice}
                          onChange={(event) => updatePosItem(item.key, { unitPrice: Number(event.target.value) })}
                          className="w-32 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        onClick={() => item.quantity > 1 ? updatePosItem(item.key, { quantity: item.quantity - 1 }) : removePosItem(item.key)}
                        aria-label={`Retirer une unité de ${item.name}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-sky-200 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-sky-300"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => updatePosItem(item.key, { quantity: item.quantity + 1 })}
                        aria-label={`Ajouter une unité de ${item.name}`}
                        disabled={Boolean(item.product && item.quantity >= item.product.stock)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-sky-200 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-sky-300"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removePosItem(item.key)}
                        aria-label={`Supprimer ${item.name} du panier`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <p className="basis-full pt-1 text-right text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
                </div>

                <div className="space-y-3 bg-white p-4 sm:p-5 dark:bg-slate-900">
                  <div>
                    <label htmlFor="pos-payment-method" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Mode de paiement</label>
                    <div className="relative">
                      <select
                        id="pos-payment-method"
                        value={paymentMethod}
                        onChange={(event) => {
                          const method = event.target.value as PosPaymentMethod;
                          setPaymentMethod(method);
                          if (method !== 'cash' && payment.amountReceived > cartTotal) {
                            setAmountPaidInput(String(cartTotal));
                          }
                        }}
                        className="min-h-11 w-full appearance-none rounded-xl border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {paymentMethods.map((method) => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="pos-amount-paid" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {paymentMethod === 'cash' ? 'Montant reçu' : 'Montant payé'}
                      </label>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setAmountPaidInput('0')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">À crédit</button>
                        <button type="button" onClick={() => setAmountPaidInput(String(cartTotal))} className="rounded-lg bg-sky-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-sky-600">Total exact</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
                      <input
                        id="pos-amount-paid"
                        type="number"
                        min="0"
                        max={paymentMethod === 'cash' ? undefined : cartTotal}
                        value={amountPaidInput}
                        onChange={(event) => setAmountPaidInput(event.target.value)}
                        onBlur={() => setAmountPaidInput(String(paymentMethod === 'cash' ? payment.amountReceived : normalizedAmountPaid))}
                        placeholder={String(cartTotal)}
                        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-black tabular-nums text-slate-900 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <div className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-2 text-center dark:border-slate-700 dark:bg-slate-900">
                        <p className={`text-sm font-bold ${paymentStatus === 'paid' ? 'text-emerald-700 dark:text-emerald-300' : paymentStatus === 'partial' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {paymentStatusLabels[paymentStatus]}
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'cash' && changeDue > 0 && (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-100 px-3 py-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <span className="text-sm font-semibold">Monnaie à rendre</span>
                        <span className="text-lg font-black tabular-nums">{formatPrice(changeDue)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${showInvoiceForm ? 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/70'}`}>
                      <span>
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Facture nominative</span>
                        <span className="hidden text-xs text-slate-500 sm:block xl:hidden 2xl:block dark:text-slate-400">Ajoute les coordonnées du client au PDF</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={showInvoiceForm}
                        onChange={(event) => setShowInvoiceForm(event.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                      />
                    </label>
                  </div>

                  {showInvoiceForm && (
                    <div className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-3 sm:grid-cols-2 dark:border-sky-900/50 dark:bg-sky-950/20">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Nom du client</label>
                        <input
                          type="text"
                          value={customerDetails.name}
                          onChange={(event) => setCustomerDetails((prev) => ({ ...prev, name: event.target.value }))}
                          className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Email</label>
                        <input
                          type="email"
                          value={customerDetails.email}
                          onChange={(event) => setCustomerDetails((prev) => ({ ...prev, email: event.target.value }))}
                          className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Téléphone</label>
                        <input
                          type="tel"
                          value={customerDetails.phone}
                          onChange={(event) => setCustomerDetails((prev) => ({ ...prev, phone: event.target.value }))}
                          className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Adresse</label>
                        <textarea
                          value={customerDetails.address}
                          onChange={(event) => setCustomerDetails((prev) => ({ ...prev, address: event.target.value }))}
                          rows={2}
                          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleConfirmCheckout}
                    className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-transparent bg-sky-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/15 transition-all hover:bg-sky-800 active:scale-[0.99] dark:bg-sky-600 dark:hover:bg-sky-500"
                  >
                    <span className="inline-flex items-center gap-2"><Receipt className="h-5 w-5" />Finaliser la vente</span>
                    <span className="font-black tabular-nums">{formatPrice(cartTotal)}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Factures de caisse</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''} POS récente{filteredInvoices.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecentInvoices((value) => !value)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {showRecentInvoices ? 'Masquer' : 'Afficher'}
                <ChevronDown className={`h-4 w-4 transition-transform ${showRecentInvoices ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showRecentInvoices && (
              <div className="mt-4">
              <div className="relative mb-4 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(event) => setInvoiceSearch(event.target.value)}
                  placeholder="Rechercher une facture..."
                  className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

            {isLoadingInvoices ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner variant="simple" size="sm" text="Chargement des factures..." />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Aucune facture de caisse trouvée.
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
                            #{invoice.id.slice(0, 8)}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusClasses[invoice.payment_status]}`}>
                            {paymentStatusLabels[invoice.payment_status]}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {invoice.customer_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(invoice.created_at).toLocaleDateString('fr-FR')} - {formatPrice(invoice.total)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Payé {formatPrice(invoice.amount_paid || 0)} - Reste {formatPrice(invoice.balance_due || 0)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                        title="Télécharger la facture"
                      >
                        <FileDown className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>
            )}
          </div>
        </div>
      </div>

      {posItems.length > 0 && (
        <button
          type="button"
          onClick={() => cartPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="fixed bottom-4 left-1/2 z-40 flex min-h-14 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl bg-slate-950 px-5 text-white shadow-2xl shadow-slate-950/30 xl:hidden dark:bg-sky-600"
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold"><ShoppingBag className="h-5 w-5" />Voir le panier ({posItems.length})</span>
          <span className="font-black tabular-nums">{formatPrice(cartTotal)}</span>
        </button>
      )}

      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Confirmer la vente</h3>

            <div className="space-y-4">
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-700">
                <div className="mb-2 flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(cartTotal)}</span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Montant payé</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(normalizedAmountPaid)}</span>
                </div>
                <div className="mb-2 flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Reste à payer</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{formatPrice(balanceDue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Mode de paiement</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {getPaymentMethodLabel(paymentMethod)}
                  </span>
                </div>
                {changeDue > 0 && (
                  <div className="mt-3 flex justify-between border-t border-emerald-200 pt-3 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300">
                    <span className="font-semibold">Monnaie à rendre</span>
                    <span className="font-black tabular-nums">{formatPrice(changeDue)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  disabled={isConfirming}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isConfirming}
                  className="flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-sky-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-800 disabled:opacity-60"
                >
                  {isConfirming ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Confirmer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
