import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];
type PaymentStatus = Database['public']['Enums']['payment_status'];
export type TrackedOrder = NonNullable<Database['public']['Functions']['get_order_tracking']['Returns']>;

export class OrderTrackingNotFoundError extends Error {
  constructor() {
    super('Commande introuvable');
    this.name = 'OrderTrackingNotFoundError';
  }
}

type OrderItemInput = Pick<OrderItem, 'product_id' | 'quantity' | 'price'> &
  Partial<Pick<OrderItem, 'item_name' | 'item_reference'>>;
type OrderInput = Pick<Order, 'customer_name' | 'email' | 'phone' | 'address' | 'notes'> & {
  status?: OrderStatus;
  total?: number;
  discount_total?: number;
  delivery_fee?: number;
  payment_method?: string | null;
  amount_paid?: number | null;
  payment_note?: string | null;
};

function getPaymentStatusFromAmount(amountPaid: number, total: number): PaymentStatus {
  if (amountPaid <= 0) return 'unpaid';
  if (amountPaid < total) return 'partial';
  return 'paid';
}

export async function createOrder(
  order: OrderInput,
  items: OrderItemInput[],
  idempotencyKey: string
) {
  const { data, error } = await supabase.rpc('create_order_secure', {
    p_customer_name: order.customer_name,
    p_email: order.email,
    p_phone: order.phone,
    p_address: order.address,
    p_notes: order.notes,
    p_items: items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    p_idempotency_key: idempotencyKey,
    p_delivery_fee: order.delivery_fee || 0,
  });

  if (error) {
    throw error;
  }
  return data;
}

export async function createPosOrder(
  order: OrderInput,
  items: Array<{
    product_id: string | null;
    item_name: string;
    item_reference?: string | null;
    quantity: number;
    unit_price: number;
  }>
) {
  const { data, error } = await supabase.rpc('create_pos_order_secure', {
    p_customer_name: order.customer_name,
    p_email: order.email,
    p_phone: order.phone,
    p_address: order.address,
    p_notes: order.notes,
    p_items: items,
    p_payment_method: order.payment_method || 'cash',
    p_amount_paid: order.amount_paid ?? order.total ?? null,
    p_payment_note: order.payment_note || null,
  });

  if (error) throw error;
  return data;
}

export async function getPublicTrackedOrder(id: string, trackingToken: string) {
  const { data, error } = await supabase.rpc('get_order_tracking', {
    p_order_id: id,
    p_tracking_token: trackingToken,
  });

  if (error) throw error;
  if (!data) throw new OrderTrackingNotFoundError();
  return data as TrackedOrder;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  options?: { estimatedDeliveryAt?: string | null; updateEstimate?: boolean }
) {
  const { data, error } = await supabase.rpc('update_order_status_secure', {
    p_order_id: orderId,
    p_status: status,
    p_estimated_delivery_at: options?.estimatedDeliveryAt || null,
    p_update_estimate: options?.updateEstimate ?? false,
  });

  if (error) throw error;
  return data;
}

export async function updateOrderPayment(
  orderId: string,
  payment: {
    payment_status: PaymentStatus;
    payment_method: string | null;
    amount_paid: number;
    payment_note: string | null;
  }
) {
  const { data: current, error: currentError } = await supabase
    .from('orders')
    .select('total_ttc,total')
    .eq('id', orderId)
    .single();

  if (currentError) throw currentError;

  const total = current.total || current.total_ttc || 0;
  const amountPaid = Math.max(0, Math.min(payment.amount_paid, total));
  const balanceDue = Math.max(0, total - amountPaid);
  const paymentStatus = getPaymentStatusFromAmount(amountPaid, total);

  const { data, error } = await supabase
    .from('orders')
    .update({
      payment_status: paymentStatus,
      payment_method: payment.payment_method,
      amount_paid: amountPaid,
      balance_due: balanceDue,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
      payment_note: payment.payment_note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
