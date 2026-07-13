import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, ClipboardList, PackageCheck, Send, ShieldCheck } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getPrimaryProductImage, getProductCategoryName } from '../lib/site';
import { isOnOrderProduct } from '../lib/productAvailability';
import {
  clearProductRequestAttempt,
  getProductRequestIdempotencyKey,
  normalizeProductRequestInput,
  PRODUCT_REQUEST_LIMITS,
} from '../lib/productRequest';
import { createProductRequest } from '../services/productRequests';
import { getProductBySlug } from '../services/products';

const FIELD_CLASS = 'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const LABEL_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400';

export function ProductRequest() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const initialQuantity = Math.min(
    PRODUCT_REQUEST_LIMITS.quantityMax,
    Math.max(PRODUCT_REQUEST_LIMITS.quantityMin, Math.trunc(Number(searchParams.get('quantity'))) || 1)
  );
  const [form, setForm] = React.useState({
    quantity: initialQuantity,
    customerName: '',
    phone: '',
    address: '',
    notes: '',
  });
  const [requestId, setRequestId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submitLockRef = React.useRef(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product-request-product', slug],
    queryFn: () => getProductBySlug(slug!),
    enabled: Boolean(slug),
    retry: false,
  });

  const updateField = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product || !isOnOrderProduct(product) || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const input = normalizeProductRequestInput({
        productId: product.id,
        quantity: form.quantity,
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      });
      const idempotencyKey = await getProductRequestIdempotencyKey(input);
      const createdRequest = await createProductRequest(input, idempotencyKey);
      clearProductRequestAttempt();
      setRequestId(createdRequest.id);
      toast.success('Votre demande a bien ete enregistree.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d enregistrer la demande.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-[32px] bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (isError || !product || !isOnOrderProduct(product)) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-xl rounded-[30px] border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Demande indisponible</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
            Ce produit n'est pas disponible sur commande ou sa fiche n'est plus active.
          </p>
          <Link to="/products" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-sky-900 px-6 text-sm font-semibold text-white">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (requestId) {
    return (
      <div className="min-h-[70vh] bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-2xl rounded-[32px] border border-emerald-200 bg-white p-6 text-center shadow-[0_28px_90px_-45px_rgba(15,23,42,0.45)] sm:p-10 dark:border-emerald-900 dark:bg-slate-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Demande enregistree</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Nous vous recontactons pour le prix et le delai.</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300">
            Votre demande concerne <strong>{product.name}</strong>, quantite <strong>{form.quantity}</strong>. Elle reste distincte d'une commande payante tant que le prix n'a pas ete confirme avec vous.
          </p>
          <p className="mt-4 text-xs text-slate-400">Reference de demande : {requestId.slice(0, 8).toUpperCase()}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={`/products/${product.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:text-white">
              Revoir le produit
            </Link>
            <Link to="/products" className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-900 px-5 text-sm font-semibold text-white">
              Continuer dans le catalogue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const image = getPrimaryProductImage(product.images);
  const category = getProductCategoryName(product);

  return (
    <div className="bg-slate-50 pb-24 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Link to={`/products/${product.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-sky-800 dark:text-sky-300">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au produit
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] sm:p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="rounded-[22px] bg-slate-100 p-3 dark:bg-slate-950">
              <img src={image} alt={product.name} className="aspect-[4/3] w-full object-contain" />
            </div>
            <span className="mt-5 inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
              Disponible sur commande
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{category}</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{product.name}</h1>
            <p className="mt-3 text-lg font-bold text-sky-800 dark:text-sky-300">Prix sur demande</p>
            {product.description ? <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{product.description}</p> : null}
          </aside>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] sm:p-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Commande speciale</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Demander ce produit</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Le prix et le delai seront confirmes par notre equipe avant toute vente.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className={LABEL_CLASS}>
                  Quantite
                  <input
                    type="number"
                    min={PRODUCT_REQUEST_LIMITS.quantityMin}
                    max={PRODUCT_REQUEST_LIMITS.quantityMax}
                    required
                    value={form.quantity}
                    onChange={(event) => updateField('quantity', Number(event.target.value))}
                    className={FIELD_CLASS}
                  />
                </label>
                <label className={LABEL_CLASS}>
                  Nom complet
                  <input
                    type="text"
                    minLength={PRODUCT_REQUEST_LIMITS.customerNameMin}
                    maxLength={PRODUCT_REQUEST_LIMITS.customerNameMax}
                    required
                    value={form.customerName}
                    onChange={(event) => updateField('customerName', event.target.value)}
                    className={FIELD_CLASS}
                    autoComplete="name"
                  />
                </label>
              </div>
              <label className={`block ${LABEL_CLASS}`}>
                Telephone
                <input
                  type="tel"
                  maxLength={PRODUCT_REQUEST_LIMITS.phoneMax}
                  required
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  className={FIELD_CLASS}
                  autoComplete="tel"
                />
              </label>
              <label className={`block ${LABEL_CLASS}`}>
                Adresse ou zone de livraison
                <textarea
                  minLength={PRODUCT_REQUEST_LIMITS.addressMin}
                  maxLength={PRODUCT_REQUEST_LIMITS.addressMax}
                  required
                  rows={3}
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  className={FIELD_CLASS}
                  autoComplete="street-address"
                />
              </label>
              <label className={`block ${LABEL_CLASS}`}>
                Commentaire facultatif
                <textarea
                  maxLength={PRODUCT_REQUEST_LIMITS.notesMax}
                  rows={4}
                  value={form.notes}
                  onChange={(event) => updateField('notes', event.target.value)}
                  className={FIELD_CLASS}
                  placeholder="Precision, couleur, delai souhaite..."
                />
                <span className="mt-1 block text-right text-[11px] font-normal normal-case tracking-normal text-slate-400">{form.notes.length} / {PRODUCT_REQUEST_LIMITS.notesMax}</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-sky-900 px-6 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60 dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                {isSubmitting ? <PackageCheck className="mr-2 h-4 w-4 animate-pulse" /> : <Send className="mr-2 h-4 w-4" />}
                {isSubmitting ? 'Enregistrement...' : 'Envoyer la demande'}
              </button>

              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Cette demande n'ajoute rien au panier et ne cree aucun montant a payer. Le produit et sa quantite sont verifies cote serveur.</p>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
