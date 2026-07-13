import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import {
  buildTrackingPath,
  buildTrackingReference,
  isLikelyNetworkError,
  parseTrackingReference,
} from '../lib/orderTracking';
import { getPublicTrackedOrder, OrderTrackingNotFoundError } from '../services/orders';
import { formatPrice } from '../lib/utils';

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function copyToClipboard(value: string, message: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  } catch {
    toast.error('Copie impossible. Selectionnez puis copiez la reference manuellement.');
  }
}

export function OrderConfirmation() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const trackingToken = searchParams.get('token') || '';
  const reference = parseTrackingReference(buildTrackingReference(orderId, trackingToken));

  const {
    data: order,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['order-confirmation', reference?.orderId, reference?.trackingToken],
    queryFn: () => getPublicTrackedOrder(reference!.orderId, reference!.trackingToken),
    enabled: Boolean(reference),
    retry: false,
    staleTime: 0,
  });

  React.useEffect(() => {
    if (!order || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const container = document.getElementById('confetti-container');
    if (!container) return;

    const colors = ['#0ea5e9', '#38bdf8', '#10b981', '#f59e0b', '#f43f5e'];
    const timers: number[] = [];
    Array.from({ length: 60 }).forEach((_, index) => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.setProperty('--x', `${Math.random() * 100}vw`);
      confetti.style.setProperty('--y', `${Math.random() * -100}vh`);
      confetti.style.setProperty('--r', `${Math.random() * 360}deg`);
      confetti.style.setProperty('--s', `${Math.random() + 0.5}`);
      confetti.style.animationDelay = `${index * 8}ms`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      container.appendChild(confetti);
      timers.push(window.setTimeout(() => confetti.remove(), 3200));
    });

    return () => {
      timers.forEach(window.clearTimeout);
      container.replaceChildren();
    };
  }, [order]);

  if (!reference) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <div className="max-w-md rounded-[30px] border border-amber-200 bg-white px-6 py-14 text-center shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] dark:border-amber-900 dark:bg-slate-900">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">Lien de confirmation incomplet</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Utilisez le lien securise affiche juste apres la commande.</p>
          <Link to="/order-tracking" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-sky-900 px-6 py-3 text-sm font-semibold text-white dark:bg-sky-600">
            Ouvrir le suivi
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950">
        <div className="container mx-auto max-w-3xl px-4 py-10">
          <div className="mx-auto mb-8 h-24 w-24 skeleton rounded-[28px]" />
          <div className="space-y-4">
            <div className="skeleton mx-auto h-9 max-w-md rounded-xl" />
            <div className="skeleton h-44 rounded-[28px]" />
            <div className="skeleton h-64 rounded-[28px]" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    const notFound = error instanceof OrderTrackingNotFoundError;
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center bg-slate-50 px-4 py-16 dark:bg-slate-950">
        <div className="max-w-md rounded-[30px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900">
          {notFound ? (
            <ShoppingBag className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          ) : (
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          )}
          <h1 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
            {notFound ? 'Commande non trouvee' : 'Confirmation temporairement indisponible'}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {notFound
              ? 'Verifiez votre lien securise ou contactez-nous.'
              : isLikelyNetworkError(error)
                ? 'Verifiez votre connexion. Votre commande peut tout de meme avoir ete enregistree.'
                : 'Une erreur est survenue pendant le chargement. Votre commande peut tout de meme avoir ete enregistree.'}
          </p>
          {!notFound && (
            <button onClick={() => refetch()} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-900 px-6 py-3 text-sm font-semibold text-white dark:bg-sky-600">
              <RefreshCw className="h-4 w-4" />
              Reessayer
            </button>
          )}
        </div>
      </div>
    );
  }

  const orderDate = new Date(order.created_at);
  const trackingReference = buildTrackingReference(reference.orderId, reference.trackingToken);
  const trackingPath = buildTrackingPath(reference);
  const trackingUrl = `${window.location.origin}${trackingPath}`;
  const shareMessage = `Suivi de ma commande Sphere Office : ${trackingUrl}`;
  const estimatedDelivery = formatDateTime(order.estimated_delivery_at);
  const steps = [
    {
      icon: Mail,
      title: 'Reference de suivi',
      text: `Conservez la reference affichee pour suivre la commande de ${order.email}.`,
    },
    {
      icon: Clock,
      title: 'Traitement de la commande',
      text: 'Notre equipe verifie la disponibilite et vous appelle pour confirmer les details.',
    },
    {
      icon: Calendar,
      title: 'Livraison estimee',
      text: estimatedDelivery || 'La date sera affichee des que notre equipe aura confirme le planning.',
    },
    {
      icon: Truck,
      title: 'Livraison',
      text: 'Le statut et la date sont actualises sur la page de suivi securisee.',
    },
  ];

  return (
    <div className="relative bg-slate-50 pb-20 dark:bg-slate-950">
      <div id="confetti-container" className="pointer-events-none fixed inset-0 z-50 overflow-hidden" />
      <style>{`
        .confetti {
          position: absolute;
          top: 0;
          left: var(--x);
          width: 10px;
          height: 10px;
          opacity: 0;
          transform: translateY(var(--y)) rotate(var(--r)) scale(var(--s));
          animation: confetti-fall 3s ease-in-out forwards;
        }
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(var(--y)) rotate(0) scale(var(--s)); }
          100% { opacity: 0; transform: translateY(100vh) rotate(var(--r)) scale(var(--s)); }
        }
        @media (prefers-reduced-motion: reduce) { .confetti { display: none; } }
      `}</style>

      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">Commande enregistree</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-24 w-24 items-center justify-center rounded-[28px] border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-[0_20px_60px_-30px_rgba(5,150,105,0.45)] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle className="h-11 w-11" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">Merci, votre commande est bien enregistree.</h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400">Nous allons vous appeler pour confirmer les details et organiser la livraison.</p>
        </div>

        <div className="mb-6 rounded-[28px] bg-gradient-to-br from-sky-950 to-sky-800 p-6 text-white shadow-[0_24px_70px_-35px_rgba(12,74,110,0.75)] dark:from-sky-800 dark:to-sky-600">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/70">Numero de commande</p>
              <p className="text-2xl font-bold">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <ShoppingBag className="h-12 w-12 opacity-80" />
          </div>
          <div className="mt-4 border-t border-white/15 pt-4">
            <div className="flex justify-between gap-4 text-sm"><span className="text-sky-100/80">Date de commande</span><span className="font-semibold">{orderDate.toLocaleDateString('fr-FR')}</span></div>
            <div className="mt-2 flex justify-between gap-4"><span className="text-sky-100/80">Total</span><span className="text-xl font-bold">{formatPrice(order.total)}</span></div>
            <div className="mt-4 rounded-2xl bg-white/10 px-3 py-3">
              <p className="text-xs text-sky-100/80">Reference securisee de suivi</p>
              <p className="mt-1 break-all font-mono text-xs">{trackingReference}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => copyToClipboard(trackingReference, 'Reference copiee')} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/20"><Copy className="h-3.5 w-3.5" />Copier la reference</button>
                <button onClick={() => copyToClipboard(trackingUrl, 'Lien de suivi copie')} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/20"><Copy className="h-3.5 w-3.5" />Copier le lien</button>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold hover:bg-emerald-500"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[24px] border border-sky-100 bg-sky-50/70 p-5 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.3)] dark:border-sky-900/60 dark:bg-sky-950/20">
          <div className="flex items-start gap-4">
            <Phone className="mt-1 h-6 w-6 shrink-0 text-sky-700 dark:text-sky-300" />
            <div><h2 className="text-lg font-semibold text-slate-950 dark:text-white">Confirmation par telephone</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Nous vous appellerons prochainement au <span className="font-semibold">{order.phone}</span> pour confirmer votre commande et organiser la livraison.</p></div>
          </div>
        </div>

        <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center text-lg font-semibold text-slate-950 dark:text-white"><ShoppingBag className="mr-2 h-5 w-5 text-sky-700 dark:text-sky-300" />Articles commandes</h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{item.item_name || item.product?.name || 'Article'}</p><p className="mt-1 text-xs text-slate-400">Quantite : {item.quantity} x {formatPrice(item.price)}</p></div>
                <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPrice(item.quantity * item.price)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-950 dark:text-white">Details de livraison</h2>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
            {[
              ['Client', order.customer_name],
              ['Email', order.email],
              ['Telephone', order.phone || 'A confirmer'],
              ['Adresse', order.address || 'A confirmer'],
              ['Livraison estimee', estimatedDelivery || 'Date a confirmer'],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-6"><dt className="text-sm text-slate-500 dark:text-slate-400">{label}</dt><dd className="break-words text-sm font-semibold text-slate-900 sm:max-w-md sm:text-right dark:text-slate-100">{value}</dd></div>
            ))}
            {order.notes && <div className="py-4"><dt className="mb-2 text-sm text-slate-500 dark:text-slate-400">Notes</dt><dd className="text-sm italic text-slate-900 dark:text-slate-100">{order.notes}</dd></div>}
          </dl>
        </div>

        <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-5 text-lg font-semibold text-slate-950 dark:text-white">Prochaines etapes</h2>
          <div className="space-y-5">
            {steps.map((step) => <div key={step.title} className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/50"><step.icon className="h-5 w-5 text-sky-700 dark:text-sky-300" /></div><div><h3 className="font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3><p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{step.text}</p></div></div>)}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-[0_12px_40px_-24px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-lg font-semibold text-slate-950 dark:text-white">Une question sur votre commande ?</h3>
          <p className="mx-auto mb-6 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">Notre equipe reste disponible pour vous aider a chaque etape.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-900 px-6 py-3 text-sm font-semibold text-white dark:bg-sky-500">Nous contacter</Link>
            <Link to={trackingPath} className="inline-flex min-h-11 items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-6 py-3 text-sm font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">Suivre ma commande</Link>
            <a href={`mailto:?subject=${encodeURIComponent('Suivi de commande Sphere Office')}&body=${encodeURIComponent(shareMessage)}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Envoyer par email</a>
          </div>
        </div>
      </div>
    </div>
  );
}
