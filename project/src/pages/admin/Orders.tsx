import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, X, Receipt, FileDown, Search, Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { updateOrderPayment, updateOrderStatus } from '../../services/orders';
import { downloadInvoicePdf } from '../../services/invoices';
import { notifyOrderStatusChange } from '../../services/statusChangeNotifications';
import { getAllowedOrderTransitions } from '../../lib/orderTracking';
import type { Database } from '../../types/database';
import { useReactToPrint } from 'react-to-print';
import { Invoice } from '../../components/ui/Invoice';
import { Pagination } from '../../components/ui/Pagination';
import toast from 'react-hot-toast';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

interface OrderWithItems extends Order {
  items: Array<{
    id: string;
    product: Database['public']['Tables']['products']['Row'] | null;
    item_name: string | null;
    item_reference: string | null;
    quantity: number;
    price: number;
  }>;
}

const statusConfig: Record<OrderStatus, { label: string; classes: string }> = {
  pending: { label: 'En attente', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  confirmed: { label: 'Confirmee', classes: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300' },
  preparing: { label: 'En preparation', classes: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300' },
  shipped: { label: 'Expediee', classes: 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300' },
  delivered: { label: 'Livree', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  cancelled: { label: 'Annulee', classes: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; classes: string }> = {
  unpaid: { label: 'Non payee', classes: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' },
  partial: { label: 'Partiellement payee', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  paid: { label: 'Payee', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  refunded: { label: 'Remboursee', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tous les statuts' },
  ...Object.entries(statusConfig).map(([value, { label }]) => ({ value, label })),
];

const PAYMENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tous les paiements' },
  ...Object.entries(paymentStatusConfig).map(([value, { label }]) => ({ value, label })),
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Non renseigne' },
  { value: 'cash', label: 'Especes' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'bank_transfer', label: 'Virement' },
  { value: 'card', label: 'Carte' },
  { value: 'other', label: 'Autre' },
];

function getPaymentStatusFromAmount(amountPaid: number, total: number): PaymentStatus {
  if (amountPaid <= 0) return 'unpaid';
  if (amountPaid < total) return 'partial';
  return 'paid';
}

function getOrderTotal(order: Pick<Order, 'total' | 'total_ttc'>) {
  return order.total || order.total_ttc || 0;
}

function formatPaymentMethod(method: string | null) {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === (method || ''))?.label || method || 'Non renseigne';
}

function getStatusOptions(status: OrderStatus) {
  return [status, ...getAllowedOrderTransitions(status)];
}

function toDateTimeLocal(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

const dateCls = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function Orders() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedOrder, setSelectedOrder] = React.useState<OrderWithItems | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [invoicePreviewOrder, setInvoicePreviewOrder] = React.useState<OrderWithItems | null>(null);
  const [deliveryEstimate, setDeliveryEstimate] = React.useState('');
  const [paymentForm, setPaymentForm] = React.useState({
    payment_status: 'unpaid' as PaymentStatus,
    payment_method: '',
    amount_paid: 0,
    payment_note: '',
  });
  const invoiceRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
  });

  const { data: orders, isLoading, isError, error } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, items:order_items(*, product:products(*))`)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as OrderWithItems[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({
      orderId,
      status,
      estimatedDeliveryAt,
      updateEstimate,
    }: {
      orderId: string;
      status: OrderStatus;
      estimatedDeliveryAt?: string | null;
      updateEstimate?: boolean;
    }) => {
      return updateOrderStatus(orderId, status, { estimatedDeliveryAt, updateEstimate });
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['pending-orders-count'] });
      setSelectedOrder((current) => current?.id === updatedOrder.id ? { ...current, ...updatedOrder } : current);
      setDeliveryEstimate(toDateTimeLocal(updatedOrder.estimated_delivery_at));
      toast.success('Suivi de commande mis a jour', { duration: 2000, position: 'top-right' });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise a jour du suivi', { duration: 3000, position: 'top-right' });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error('Commande introuvable');
      const total = getOrderTotal(selectedOrder);
      const amountPaid = Math.max(0, Math.min(paymentForm.amount_paid, total));
      return updateOrderPayment(selectedOrder.id, {
        payment_status: getPaymentStatusFromAmount(amountPaid, total),
        payment_method: paymentForm.payment_method || null,
        amount_paid: amountPaid,
        payment_note: paymentForm.payment_note || null,
      }).then(async (updatedOrder) => {
        try {
          await notifyOrderStatusChange({
            orderId: selectedOrder.id,
            kind: 'payment_status',
            oldStatus: selectedOrder.payment_status,
            newStatus: updatedOrder.payment_status,
            oldLabel: paymentStatusConfig[selectedOrder.payment_status].label,
            newLabel: paymentStatusConfig[updatedOrder.payment_status as PaymentStatus].label,
          });
        } catch (error) {
          console.error('Notification statut paiement non creee:', error);
          toast.error('Paiement mis a jour, mais notification non creee', { duration: 3500, position: 'top-right' });
        }
        return updatedOrder;
      });
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedOrder((current) => current ? { ...current, ...updatedOrder } : current);
      toast.success('Paiement mis a jour', { duration: 2000, position: 'top-right' });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise a jour du paiement', { duration: 3000, position: 'top-right' });
    },
  });

  const handleDownloadPdf = async (orderId: string) => {
    try {
      await downloadInvoicePdf(orderId);
      toast.success('Facture PDF téléchargée', { duration: 2000, position: 'top-right' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du téléchargement', { duration: 3000, position: 'top-right' });
    }
  };

  React.useEffect(() => {
    const requestedOrderId = searchParams.get('orderId');
    if (!requestedOrderId || !orders?.length) return;
    const matchingOrder = orders.find((o) => o.id === requestedOrderId);
    if (!matchingOrder) return;
    setSelectedOrder(matchingOrder);
    setPaymentForm({
      payment_status: matchingOrder.payment_status,
      payment_method: matchingOrder.payment_method || '',
      amount_paid: matchingOrder.amount_paid || 0,
      payment_note: matchingOrder.payment_note || '',
    });
    setDeliveryEstimate(toDateTimeLocal(matchingOrder.estimated_delivery_at));
    setIsModalOpen(true);
  }, [orders, searchParams]);

  const openOrderDetails = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setPaymentForm({
      payment_status: order.payment_status,
      payment_method: order.payment_method || '',
      amount_paid: order.amount_paid || 0,
      payment_note: order.payment_note || '',
    });
    setDeliveryEstimate(toDateTimeLocal(order.estimated_delivery_at));
    setIsModalOpen(true);
    setSearchParams({ orderId: order.id });
  };

  const closeOrderDetails = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setSearchParams({});
  };

  const openInvoicePreview = (order: OrderWithItems) => {
    setInvoicePreviewOrder(order);
  };

  const closeInvoicePreview = () => {
    setInvoicePreviewOrder(null);
  };

  const resetPage = () => setCurrentPage(1);

  const filteredOrders = React.useMemo(() => {
    if (!orders) return [];
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !q ||
        o.id.toLowerCase().includes(q) ||
        (o.customer_name ?? '').toLowerCase().includes(q) ||
        (o.email ?? '').toLowerCase().includes(q) ||
        (o.phone ?? '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchPayment = !paymentStatusFilter || o.payment_status === paymentStatusFilter;
      const orderDate = new Date(o.created_at);
      const matchFrom = !dateFrom || orderDate >= new Date(dateFrom);
      const matchTo = !dateTo || orderDate <= new Date(dateTo + 'T23:59:59');
      return matchSearch && matchStatus && matchPayment && matchFrom && matchTo;
    });
  }, [orders, search, statusFilter, paymentStatusFilter, dateFrom, dateTo]);

  const filteredTotal = React.useMemo(
    () => filteredOrders.reduce((sum, o) => sum + o.total, 0),
    [filteredOrders]
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  const hasActiveFilter = !!(search || statusFilter || paymentStatusFilter || dateFrom || dateTo);

  const exportToCSV = () => {
    const BOM = '﻿';
    const headers = ['ID', 'Client', 'Email', 'Téléphone', 'Adresse', 'Statut', 'Total (FCFA)', 'Date'];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.customer_name ?? '',
      o.email ?? '',
      o.phone ?? '',
      (o.address ?? '').replace(/\n/g, ' '),
      statusConfig[o.status].label,
      String(o.total),
      new Date(o.created_at).toLocaleDateString('fr-FR'),
    ]);
    const csv =
      BOM +
      [headers, ...rows]
        .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${filteredOrders.length} commande${filteredOrders.length > 1 ? 's' : ''} exportée${filteredOrders.length > 1 ? 's' : ''}`, { duration: 2000, position: 'top-right' });
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-7 w-36 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800 flex-1" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        <h1 className="text-lg font-semibold">Impossible de charger les commandes</h1>
        <p className="mt-2 text-sm">
          {error instanceof Error ? error.message : 'Vérifiez les droits admin et la connexion Supabase.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Commandes</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {hasActiveFilter ? (
              <>
                <span className="font-semibold text-sky-600 dark:text-sky-400">{filteredOrders.length}</span>{' '}
                résultat{filteredOrders.length > 1 ? 's' : ''} sur {orders?.length ?? 0} commande{(orders?.length ?? 0) > 1 ? 's' : ''}
              </>
            ) : (
              <>{orders?.length ?? 0} commande{(orders?.length ?? 0) > 1 ? 's' : ''} au total</>
            )}
            {filteredOrders.length > 0 && (
              <> · CA : <span className="font-semibold text-sky-600 dark:text-sky-400">{formatPrice(filteredTotal)}</span></>
            )}
          </p>
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredOrders.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-95 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par ID, client, e-mail ou téléphone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); resetPage(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
          className={`${dateCls} shrink-0`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={paymentStatusFilter}
          onChange={(e) => { setPaymentStatusFilter(e.target.value); resetPage(); }}
          className={`${dateCls} shrink-0`}
        >
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-xs text-slate-500 whitespace-nowrap">Du</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); resetPage(); }}
            className={dateCls}
          />
          <span className="text-xs text-slate-500">au</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); resetPage(); }}
            className={dateCls}
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); resetPage(); }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Effacer les dates"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {paginatedOrders.map((order) => {
          const cfg = statusConfig[order.status];
          const payCfg = paymentStatusConfig[order.payment_status];
          return (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold text-slate-500">#{order.id.slice(0, 8)}</p>
                  <h3 className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{order.customer_name}</h3>
                  <p className="truncate text-xs text-slate-400">{order.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.classes}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{formatPrice(order.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paiement</p>
                  <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${payCfg.classes}`}>
                    {payCfg.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Reste</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{formatPrice(order.balance_due || 0)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <select
                  value={order.status}
                  onChange={(e) => updateStatus.mutate({ orderId: order.id, status: e.target.value as OrderStatus })}
                  disabled={updateStatus.isPending}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-sky-500/20 sm:w-auto ${cfg.classes}`}
                >
                  {getStatusOptions(order.status).map((status) => (
                    <option key={status} value={status}>{statusConfig[status].label}</option>
                  ))}
                </select>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => openOrderDetails(order)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Eye className="h-4 w-4" />
                    Details
                  </button>
                  <button
                    onClick={() => openInvoicePreview(order)}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-900 px-3 py-2 text-sm font-semibold text-white dark:bg-sky-600"
                  >
                    <Receipt className="h-4 w-4" />
                    Facture
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {paginatedOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
            {hasActiveFilter ? 'Aucune commande ne correspond a ces criteres.' : 'Aucune commande pour le moment.'}
          </div>
        )}
      </div>

      <div className="hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] overflow-hidden dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                {['Commande', 'Client', 'Total', 'Statut', 'Paiement', 'Date', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 ${i === 6 ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedOrders.map((order) => {
                const cfg = statusConfig[order.status];
                const payCfg = paymentStatusConfig[order.payment_status];
                return (
                  <tr key={order.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{order.customer_name}</div>
                      <div className="text-xs text-slate-400">{order.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatPrice(order.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus.mutate({ orderId: order.id, status: e.target.value as OrderStatus })}
                        disabled={updateStatus.isPending}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-colors ${cfg.classes}`}
                      >
                        {getStatusOptions(order.status).map((status) => (
                          <option key={status} value={status}>{statusConfig[status].label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${payCfg.classes}`}>
                        {payCfg.label}
                      </span>
                      {order.balance_due > 0 && (
                        <div className="mt-1 text-xs text-slate-400">Reste {formatPrice(order.balance_due)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openOrderDetails(order)}
                          className="rounded-xl p-2 text-slate-400 transition-all hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:hover:text-sky-300"
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(order.id)}
                          className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Télécharger PDF"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openInvoicePreview(order)}
                          className="rounded-xl p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Voir la facture"
                        >
                          <Receipt className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                    {hasActiveFilter ? 'Aucune commande ne correspond à ces critères.' : 'Aucune commande pour le moment.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            itemLabel="commande"
          />
        )}
      </div>

      {filteredOrders.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            itemLabel="commande"
          />
        </div>
      )}

      {/* Order details modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-3 py-6 sm:p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeOrderDetails} />
          <div className="relative my-auto flex max-h-[calc(100dvh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Commande #{selectedOrder.id.slice(0, 8)}
                </h2>
                <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig[selectedOrder.status].classes}`}>
                  {statusConfig[selectedOrder.status].label}
                </span>
              </div>
              <button
                onClick={closeOrderDetails}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Client</h3>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedOrder.customer_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedOrder.email}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedOrder.phone}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Livraison</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{selectedOrder.address}</p>
                  {selectedOrder.notes && (
                    <p className="mt-2 text-xs text-slate-400 italic">{selectedOrder.notes}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Suivi client</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Cette estimation est affichee sur la confirmation et la page de suivi securisee.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    Livraison estimee
                    <input
                      type="datetime-local"
                      value={deliveryEstimate}
                      min={toDateTimeLocal(selectedOrder.created_at)}
                      onChange={(event) => setDeliveryEstimate(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate({
                      orderId: selectedOrder.id,
                      status: selectedOrder.status,
                      estimatedDeliveryAt: deliveryEstimate ? new Date(deliveryEstimate).toISOString() : null,
                      updateEstimate: true,
                    })}
                    disabled={updateStatus.isPending}
                    className="min-h-11 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-sky-600"
                  >
                    {updateStatus.isPending ? 'Enregistrement...' : deliveryEstimate ? 'Enregistrer la date' : 'Effacer la date'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Articles</h3>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            Array.isArray(item.product?.images) && item.product.images.length > 0
                              ? item.product.images[0]
                              : 'https://images.unsplash.com/photo-1553532434-5ab5b6b84993?w=200&auto=format&fit=crop'
                          }
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.item_name || item.product?.name || 'Article'}</p>
                          <p className="text-xs text-slate-400">Qté : {item.quantity} × {formatPrice(item.price)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4 dark:bg-slate-800/50">
                <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Total</span>
                <span className="text-lg font-bold text-sky-900 dark:text-sky-300">{formatPrice(getOrderTotal(selectedOrder))}</span>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Totaux</h3>
                  {[
                    ['Sous-total', selectedOrder.subtotal],
                    ['Remise', selectedOrder.discount_total],
                    ['Livraison', selectedOrder.delivery_fee],
                    ['Total', getOrderTotal(selectedOrder)],
                    ['Montant paye', selectedOrder.amount_paid],
                    ['Reste a payer', selectedOrder.balance_due],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatPrice(Number(value || 0))}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Paiement</h3>
                  <div className="mb-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Statut</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentStatusConfig[selectedOrder.payment_status].classes}`}>
                        {paymentStatusConfig[selectedOrder.payment_status].label}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-500">Methode</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{formatPaymentMethod(selectedOrder.payment_method)}</span>
                    </div>
                    {selectedOrder.paid_at && (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Date paiement</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{new Date(selectedOrder.paid_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    {selectedOrder.payment_note && (
                      <div>
                        <span className="text-slate-500">Note</span>
                        <p className="mt-1 text-slate-700 dark:text-slate-300">{selectedOrder.payment_note}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <select
                      value={paymentForm.payment_status}
                      disabled
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {Object.entries(paymentStatusConfig).map(([value, { label }]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm((current) => ({ ...current, payment_method: e.target.value }))}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {PAYMENT_METHOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max={getOrderTotal(selectedOrder)}
                      value={paymentForm.amount_paid}
                      onChange={(e) => {
                        const total = getOrderTotal(selectedOrder);
                        const amountPaid = Math.max(0, Math.min(Number(e.target.value), total));
                        setPaymentForm((current) => ({
                          ...current,
                          amount_paid: amountPaid,
                          payment_status: getPaymentStatusFromAmount(amountPaid, total),
                        }));
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Montant paye"
                    />
                    <textarea
                      value={paymentForm.payment_note}
                      onChange={(e) => setPaymentForm((current) => ({ ...current, payment_note: e.target.value }))}
                      rows={2}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      placeholder="Note paiement"
                    />
                    <button
                      type="button"
                      onClick={() => updatePayment.mutate()}
                      disabled={updatePayment.isPending}
                      className="rounded-full bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50 dark:bg-sky-600"
                    >
                      {updatePayment.isPending ? 'Mise a jour...' : 'Mettre a jour le paiement'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 -mx-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <button
                  onClick={() => openInvoicePreview(selectedOrder)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Receipt className="h-4 w-4" />
                  Voir la facture
                </button>
                <button
                  onClick={() => handleDownloadPdf(selectedOrder.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-800 active:scale-95 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  <FileDown className="h-4 w-4" />
                  Télécharger la facture PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {invoicePreviewOrder && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 pt-6 backdrop-blur-sm">
          <div className="w-full max-w-5xl">
            <div className="sticky top-4 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Facture #{invoicePreviewOrder.id.slice(0, 8)}</h2>
                <p className="text-xs text-slate-500">Donnees figees depuis la commande enregistree</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(invoicePreviewOrder.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Receipt className="h-4 w-4" />
                  Imprimer
                </button>
                <button
                  onClick={closeInvoicePreview}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <Invoice ref={invoiceRef} order={invoicePreviewOrder} />
          </div>
        </div>
      )}

      {!invoicePreviewOrder && selectedOrder && (
        <div style={{ display: 'none' }}>
          <Invoice ref={invoiceRef} order={selectedOrder} />
        </div>
      )}
    </div>
  );
}
