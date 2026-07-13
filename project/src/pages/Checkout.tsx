import React from 'react';
import { ArrowRight, Lock, ShoppingBag, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cart';
import { createOrder } from '../services/orders';
import { formatPrice } from '../lib/utils';
import { getProductsByIds } from '../services/products';
import { getEffectiveProductPrice, isSellableProduct } from '../lib/productAvailability';

const INPUT_CLASS =
  'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500';

const LABEL_CLASS = 'block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400';

const CHECKOUT_ATTEMPT_STORAGE_KEY = 'sphere-checkout-attempt-v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type CheckoutAttempt = { key: string; fingerprint: string };
let memoryCheckoutAttempt: CheckoutAttempt | null = null;

function readCheckoutAttempt() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) || 'null') as Partial<CheckoutAttempt> | null;
    if (parsed && typeof parsed.key === 'string' && typeof parsed.fingerprint === 'string') {
      memoryCheckoutAttempt = { key: parsed.key, fingerprint: parsed.fingerprint };
    }
  } catch {
    // Keep the in-memory fallback when browser storage is unavailable or corrupt.
  }

  return memoryCheckoutAttempt;
}

function writeCheckoutAttempt(attempt: CheckoutAttempt) {
  memoryCheckoutAttempt = attempt;
  try {
    sessionStorage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // The in-memory copy still protects retries in the current page lifecycle.
  }
}

function clearCheckoutAttempt() {
  memoryCheckoutAttempt = null;
  try {
    sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // Storage may be disabled; the in-memory copy has already been cleared.
  }
}

async function hashCheckoutPayload(payload: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getCheckoutIdempotencyKey(payload: unknown) {
  const fingerprint = await hashCheckoutPayload(payload);

  const stored = readCheckoutAttempt();
  if (stored && UUID_PATTERN.test(stored.key) && stored.fingerprint === fingerprint) {
    return stored.key;
  }

  const key = crypto.randomUUID();
  writeCheckoutAttempt({ key, fingerprint });
  return key;
}

export function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, getTotal, clearCart, syncProducts } = useCartStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submitLockRef = React.useRef(false);
  const orderCompletedRef = React.useRef(false);
  const [formData, setFormData] = React.useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  React.useEffect(() => {
    if (items.length === 0 && !orderCompletedRef.current) navigate('/cart');
  }, [items.length, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    const customerName = formData.customerName.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const notes = formData.notes.trim();

    if (customerName.length < 2) {
      toast.error('Veuillez saisir un nom complet valide.');
      return;
    }
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      toast.error('Veuillez saisir une adresse email valide.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 8) {
      toast.error('Veuillez saisir un numero de telephone valide.');
      return;
    }
    if (address.length < 4) {
      toast.error('Veuillez saisir une adresse de livraison valide.');
      return;
    }
    if (notes.length > 2000) {
      toast.error('Les notes ne doivent pas depasser 2 000 caracteres.');
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const latestProducts = await getProductsByIds(items.map((item) => item.product.id));
      const latestProductsById = new Map(latestProducts.map((product) => [product.id, product]));
      const cartChanged = latestProducts.length !== items.length || items.some((item) => {
        const latest = latestProductsById.get(item.product.id);
        return !latest
          || latest.price !== item.product.price
          || latest.sale_price !== item.product.sale_price
          || latest.availability !== item.product.availability
          || latest.is_in_stock !== item.product.is_in_stock;
      });

      if (cartChanged) {
        syncProducts(latestProducts);
        toast.error('Le catalogue a change. Verifiez votre panier actualise avant de confirmer.');
        return;
      }

      if (latestProducts.some((product) => !isSellableProduct(product))) {
        toast.error('Un produit du panier n est plus en stock.');
        return;
      }

      const orderPayload = {
        customer_name: customerName,
        email,
        phone,
        address,
        notes: notes || null,
        total: getTotal(),
        delivery_fee: 0,
        status: 'pending' as const,
      };
      const itemPayload = items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: getEffectiveProductPrice(item.product) || 0,
      }));
      const idempotencyKey = await getCheckoutIdempotencyKey({ order: orderPayload, items: itemPayload });
      const order = await createOrder(orderPayload, itemPayload, idempotencyKey);
      orderCompletedRef.current = true;
      clearCheckoutAttempt();
      clearCart();
      toast.success('Commande confirmee !');
      navigate(`/order-confirmation/${order.id}?token=${encodeURIComponent(order.tracking_token)}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la creation de la commande.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="mobile-checkout-page bg-slate-50 pb-28 dark:bg-slate-950 md:pb-10">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-12">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-sky-700 dark:text-sky-300" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Finaliser la commande
            </h1>
          </div>
        </div>
      </div>

      <div className="mobile-app-checkout-steps md:hidden">
        <div className="is-active">
          <span>1</span>
          <p>Livraison</p>
        </div>
        <div>
          <span>2</span>
          <p>Resume</p>
        </div>
        <div>
          <span>3</span>
          <p>Validation</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-12">
        <form id="checkout-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">

            {/* Formulaire */}
            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.2)] sm:rounded-[28px] sm:p-6 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Informations de livraison
                </p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="customerName" className={LABEL_CLASS}>Nom complet</label>
                    <input
                      type="text"
                      id="customerName"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Prenom et nom"
                      value={formData.customerName}
                      onChange={(e) => setFormData((p) => ({ ...p, customerName: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className={LABEL_CLASS}>Email</label>
                      <input
                        type="email"
                        id="email"
                        required
                        maxLength={254}
                        placeholder="vous@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className={LABEL_CLASS}>Telephone</label>
                      <input
                        type="tel"
                        id="phone"
                        required
                        minLength={8}
                        maxLength={30}
                        placeholder="+221 77 000 00 00"
                        value={formData.phone}
                        onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="address" className={LABEL_CLASS}>Adresse de livraison</label>
                    <textarea
                      id="address"
                      required
                      minLength={4}
                      maxLength={500}
                      rows={3}
                      placeholder="Rue, quartier, ville, region..."
                      value={formData.address}
                      onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className={LABEL_CLASS}>Notes <span className="normal-case font-normal text-slate-400">(optionnel)</span></label>
                    <textarea
                      id="notes"
                      rows={2}
                      maxLength={2000}
                      placeholder="Instructions speciales, horaires de livraison..."
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>

              {/* Livraison badge */}
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <Truck className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Livraison partout au Senegal - delai et frais confirmes apres commande
                </p>
              </div>
            </div>

            {/* Recapitulatif */}
            <div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.2)] sm:rounded-[28px] sm:p-6 lg:sticky lg:top-32 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Recapitulatif
                </p>

                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                          {item.product.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {item.quantity} x {formatPrice(getEffectiveProductPrice(item.product) || 0)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatPrice((getEffectiveProductPrice(item.product) || 0) * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Sous-total</span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatPrice(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                    <span>Livraison</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">A confirmer</span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total</span>
                    <span className="text-xl font-bold tabular-nums text-sky-900 dark:text-sky-300">{formatPrice(getTotal())}</span>
                  </div>
                </div>

                {/* CTA desktop */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 hidden w-full items-center justify-center gap-2 rounded-full bg-sky-900 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-60 md:flex dark:bg-sky-500 dark:hover:bg-sky-400"
                >
                  {isSubmitting ? 'Traitement...' : 'Confirmer la commande'}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                </button>
                <p className="mt-3 hidden text-center text-[11px] text-slate-400 md:block dark:text-slate-500">
                  <Lock className="mr-1 inline h-3 w-3" />
                  Commande traitee en toute securite
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Sticky CTA mobile */}
      <div className="mobile-sticky-cta bar-above-dock fixed inset-x-0 z-40 border-t border-slate-200/80 bg-white/96 px-4 py-3 shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)] backdrop-blur-2xl md:hidden dark:border-slate-800/80 dark:bg-slate-950/96">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Total</p>
            <p className="text-lg font-bold tabular-nums text-sky-900 dark:text-sky-300">{formatPrice(getTotal())}</p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
          >
            {isSubmitting ? 'Traitement...' : 'Confirmer'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
