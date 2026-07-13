import React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  buildTrackingPath,
  buildTrackingReference,
  getOrderTrackingStepIndex,
  isLikelyNetworkError,
  ORDER_STATUS_LABELS,
  parseTrackingReference,
  TRACKING_REFRESH_INTERVAL_MS,
  type OrderStatus,
  type TrackingReference,
} from '../lib/orderTracking';
import { getPublicTrackedOrder, OrderTrackingNotFoundError } from '../services/orders';
import { formatPrice } from '../lib/utils';

const steps: Array<{
  key: Exclude<OrderStatus, 'cancelled'>;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { key: 'pending', label: 'Recue', description: 'Votre commande a ete recue et sera verifiee par notre equipe.', icon: Clock },
  { key: 'confirmed', label: 'Confirmee', description: 'Votre commande et les conditions de livraison sont confirmees.', icon: CheckCircle2 },
  { key: 'preparing', label: 'En preparation', description: 'Vos articles sont en cours de preparation.', icon: Package },
  { key: 'shipped', label: 'Expediee', description: 'Votre commande est en route vers l’adresse indiquee.', icon: Truck },
  { key: 'delivered', label: 'Livree', description: 'La livraison est terminee. Merci pour votre confiance.', icon: CheckCircle2 },
];

const paymentLabels = {
  unpaid: 'Non payee',
  partial: 'Partiellement payee',
  paid: 'Payee',
  refunded: 'Remboursee',
} as const;

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function copyToClipboard(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error('Copie impossible. Selectionnez puis copiez la reference manuellement.');
  }
}

function TrackingForm({
  onSubmit,
  initialMessage,
}: {
  onSubmit: (reference: TrackingReference) => void;
  initialMessage?: string;
}) {
  const [input, setInput] = React.useState('');
  const [validationError, setValidationError] = React.useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const reference = parseTrackingReference(input);
    if (!reference) {
      setValidationError('La reference doit contenir les deux identifiants affiches apres la commande.');
      return;
    }
    setValidationError('');
    onSubmit(reference);
  };

  return (
    <div className="mx-auto max-w-md">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.2)] sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 dark:bg-sky-950/50">
          <Package className="h-7 w-7 text-sky-700 dark:text-sky-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Suivre ma commande</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Collez la reference securisee recue sur l’ecran de confirmation.
        </p>
        {initialMessage && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {initialMessage}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Identifiant commande:jeton securise"
            autoComplete="off"
            aria-label="Reference securisee de suivi"
            aria-invalid={Boolean(validationError)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="inline-flex min-h-11 items-center rounded-xl bg-sky-900 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-sky-800 active:scale-95 disabled:opacity-40 dark:bg-sky-600 dark:hover:bg-sky-500"
            aria-label="Rechercher la commande"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        {validationError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{validationError}</p>}
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Pour votre securite, le numero court seul ne permet pas d’acceder aux informations de livraison.
        </p>
      </form>
    </div>
  );
}

export function OrderTracking() {
  const navigate = useNavigate();
  const { orderId: urlOrderId } = useParams<{ orderId?: string }>();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') ?? '';
  const reference = urlOrderId && urlToken
    ? parseTrackingReference(buildTrackingReference(urlOrderId, urlToken))
    : null;
  const incompleteReferenceMessage = urlOrderId || urlToken
    ? 'Ce lien de suivi est incomplet ou invalide. Collez la reference securisee complete.'
    : undefined;

  const {
    data: order,
    error,
    isError,
    isFetching,
    isLoading,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: ['order-tracking', reference?.orderId, reference?.trackingToken],
    queryFn: () => getPublicTrackedOrder(reference!.orderId, reference!.trackingToken),
    enabled: Boolean(reference),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: TRACKING_REFRESH_INTERVAL_MS,
  });

  const currentStepIndex = order ? getOrderTrackingStepIndex(order.status) : -1;
  const trackingReference = reference
    ? buildTrackingReference(reference.orderId, reference.trackingToken)
    : '';
  const trackingPath = reference ? buildTrackingPath(reference) : '';
  const trackingUrl = trackingPath ? `${window.location.origin}${trackingPath}` : '';
  const whatsappShareUrl = trackingUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Suivi de ma commande Sphere Office : ${trackingUrl}`)}`
    : '';

  const startNewSearch = () => navigate('/order-tracking');

  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="flex min-w-0 items-center gap-3">
            <Package className="h-6 w-6 text-sky-700 dark:text-sky-300" />
            <h1 className="min-w-0 break-words text-[1.55rem] font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              Suivi de commande
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto overflow-hidden px-4 py-10 sm:py-14">
        {!reference ? (
          <TrackingForm
            initialMessage={incompleteReferenceMessage}
            onSubmit={(parsedReference) => navigate(buildTrackingPath(parsedReference))}
          />
        ) : isLoading ? (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
          </div>
        ) : isError || !order ? (
          <div className="mx-auto max-w-md text-center">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 dark:border-slate-700 dark:bg-slate-900">
              {isLikelyNetworkError(error) ? (
                <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
              ) : (
                <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
              )}
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {error instanceof OrderTrackingNotFoundError ? 'Commande introuvable' : 'Suivi temporairement indisponible'}
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {error instanceof OrderTrackingNotFoundError
                  ? 'Aucune commande ne correspond a cette reference. Verifiez la reference ou contactez-nous.'
                  : 'La commande existe peut-etre toujours. Verifiez votre connexion puis reessayez dans quelques instants.'}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {!(error instanceof OrderTrackingNotFoundError) && (
                  <button
                    onClick={() => refetch()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-sky-600"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reessayer
                  </button>
                )}
                <button
                  onClick={startNewSearch}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Nouvelle recherche
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Commande</p>
                <h2 className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
                  #{order.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Passee le {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={startNewSearch}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Nouvelle recherche
              </button>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900/60 dark:bg-sky-950/20">
              <div>
                <p className="text-sm font-semibold text-sky-900 dark:text-sky-200">Actualisation automatique toutes les 30 secondes</p>
                <p className="mt-0.5 text-xs text-sky-700/70 dark:text-sky-300/70">
                  Dernier controle : {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR') : 'maintenant'}
                </p>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-800 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>

            {order.status === 'cancelled' ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/30">
                <div className="flex items-start gap-4">
                  <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <h3 className="text-lg font-bold text-red-900 dark:text-red-200">Commande annulee</h3>
                    <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
                      Cette commande ne sera pas preparee ni expediee. Contactez-nous si vous souhaitez connaitre le motif ou passer une nouvelle commande.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
                <h3 className="mb-6 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Statut de la commande</h3>
                {steps.map((step, index) => {
                  const done = index <= currentStepIndex;
                  const active = index === currentStepIndex;
                  const isLast = index === steps.length - 1;
                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${active ? 'border-sky-500 bg-sky-500 text-white' : done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-300 dark:border-slate-700 dark:bg-slate-900'}`}>
                          <step.icon className="h-4 w-4" />
                        </div>
                        {!isLast && <div className={`my-1 h-8 w-0.5 rounded-full ${index < currentStepIndex ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                      </div>
                      <div className={`pt-1 ${isLast ? '' : 'pb-4'}`}>
                        <p className={`text-sm font-semibold ${done ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{step.label}</p>
                        {active && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-slate-400"><CalendarDays className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Livraison estimee</span></div>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatDateTime(order.estimated_delivery_at) || 'Date a confirmer par notre equipe'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-slate-400"><Wallet className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Paiement</span></div>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {paymentLabels[order.payment_status] || 'A confirmer'}
                </p>
                {order.balance_due > 0 && <p className="mt-1 text-xs text-slate-500">Reste : {formatPrice(order.balance_due)}</p>}
              </div>
            </div>

            {order.status_history?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Historique</h3>
                <div className="mt-4 space-y-3">
                  {order.status_history.slice(0, 8).map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0 dark:border-slate-800">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{ORDER_STATUS_LABELS[entry.new_status]}</p>
                        {entry.note && <p className="mt-0.5 text-xs text-slate-400">{entry.note}</p>}
                      </div>
                      <time className="shrink-0 text-right text-xs text-slate-400">{formatDateTime(entry.changed_at)}</time>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4">
                    <img
                      src={Array.isArray(item.product?.images) && item.product.images.length > 0 ? item.product.images[0] : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 object-cover dark:border-slate-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.item_name || item.product?.name || 'Article'}</p>
                      <p className="text-xs text-slate-400">Qte : {item.quantity} x {formatPrice(item.price)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-slate-50 px-5 py-4 dark:bg-slate-800/50">
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Total</span>
                <span className="text-base font-bold text-sky-900 dark:text-sky-300">{formatPrice(order.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Client</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{order.customer_name}</p>
                <p className="mt-1 text-sm text-slate-500">{order.email}</p>
                {order.phone && <p className="mt-0.5 text-sm text-slate-500">{order.phone}</p>}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Adresse de livraison</p>
                <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{order.address || '-'}</p>
                {order.notes && <p className="mt-2 text-xs italic text-slate-400">{order.notes}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Conserver ou partager ce suivi</h3>
              <p className="mt-1 break-all font-mono text-xs text-slate-400">{trackingReference}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button onClick={() => copyToClipboard(trackingReference, 'Reference copiee')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"><Copy className="h-4 w-4" />Copier la reference</button>
                <button onClick={() => copyToClipboard(trackingUrl, 'Lien de suivi copie')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"><Copy className="h-4 w-4" />Lien</button>
                <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              </div>
            </div>

            <div className="text-center">
              <Link to="/products" className="text-sm font-semibold text-sky-700 transition-colors hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300">Continuer mes achats -&gt;</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
